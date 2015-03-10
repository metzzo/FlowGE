/*jshint unused:false */
'use strict';

var flow = (function() {
  var changed = []; // this array contains all listeners that have to be fired in the next update
  var oldChanged = []; // so it does not confuse old/new changes
  var updateId = 1; // continuously updating id to know in which update a changed happened

  var update = function() {
    // swap changed arrays
    var tmp = oldChanged;
    oldChanged = changed;
    changed = tmp;
    changed.length = 0;
    var lastUpdateId = updateId;
    updateId++;
    // first let all the values flow
    for (var i = oldChanged.length - 1; i >= 0; i--) {
      var change = oldChanged[i];
      change.__flow(lastUpdateId);
    }

    // second call subscribers
    for (var i = oldChanged.length - 1; i >= 0; i--) {
      var change = oldChanged[i];
      change.__update();
    }
  };

  var updateAll = function() {
    var count = 0;
    do {
      if (count > 1000) throw new Error('Too long update chain :(');
      update();
      count++;
    } while (changed.length > 0);
  };

  var makeSetter = function(key) {
    return function (value) {
      switch (typeof value) {
        case 'function':
          value = value.bind(this);
          break;
        case 'object':
          if (!Array.isArray(this[key])) {
            if (!value.__subscriber) {
              value = signal(value);
            }

            // remove old listener
            if (this[key].__subscriber) {
              flow.off(this[key], this);
            }

            // add new listener
            var self = this;
            flow.on(value, function(old) {
              self.__notify(key, this, old);
            }, self);
          }

          break;
      }

      this.__notify(key, value, this.__target[key]);
    };
  };

  var makeGetter = function(key) {
    return function() {
      return this.__target[key];
    };
  };


  var signal = function(obj) {
    var tmpObj = {}; // this object is used to 'save' object saves
    var oldObj = {}; // used to keep old state of object
    var newObj = {}; // used to keep new state of object

    Object.defineProperties(newObj, {
      '__target': {
        'value': obj,
        'writable': false,
        'enumerable': false
      },
      '__subscriber': {
        'value': [],
        'writable': false,
        'enumerable': false
      },
      '__dirty': {
        'value': false,
        'writable': true,
        'enumerable': false
      },
      '__lastUpdated': {
        'value': 0,
        'writable': true,
        'enumerable': false
      },
      '__tmpObj': {
        value: tmpObj,
        'writable': false,
        'enumerable': false
      },
      '__shouldUpdate': {
        'value': false,
        'writable': true,
        'enumerable': false
      },
      '__flow': {
        'writable': false,
        'enumerable': false,
        'value': function(lastUpdateId) {
          if ((newObj.__dirty && newObj.__lastUpdated <= lastUpdateId) || lastUpdateId === -1) {
            newObj.__shouldUpdate = true;
            newObj.__dirty = false;

            for (var key in tmpObj) {
              var value = tmpObj[key];
              if (value !== undefined) {
                newObj.__target[key] = value;
              }
            }
          } else {
            newObj.__dirty = false;
          }
        }
      },
      '__update': {
        'writable': false,
        'value': function() {
          if (this.__shouldUpdate) {
            this.__shouldUpdate = false;

            var subscriber = newObj.__subscriber;
            for (var j = 0; j < subscriber.length; j++) {
              subscriber[j].func.call(newObj, oldObj);
            }

            for (var attrKey in tmpObj) {
              tmpObj[attrKey]= undefined;
            }
          }
        },
        'enumerable': false
      },
      '__notify': {
        'value': function(key, value, old) {
          if (tmpObj[key] === value || (tmpObj[key] === undefined && newObj[key] === value)) {
            // return;
          }

          if (key !== undefined) {
            tmpObj[key] = value;
            oldObj[key] = old;
          }

          newObj.__lastUpdated = updateId;
          newObj.__dirty = true;
          changed.push(newObj);
        },
        'writable': true,
        'enumerable': false
      },

      // PUBLIC
      'link': {
        'writable': false,
        'enumerable': false,
        'value': function(obj) {
          for (var key in newObj) {
            if (obj[key] === undefined) {
              obj[key] = newObj[key];
            }
          }

          if (!obj.__subscriber) {
            obj = flow.signal(obj);
          }

          // proxy all changes between objects
          var oldNotify = obj.__notify;
          obj.__notify = function(key, value, old) {
            if (obj.__tmpObj[key] !== value) {
              oldNotify(key, value, old);
              var oldVal = newObj[key];
              newObj.__notify(key, value, oldVal !== undefined ? oldVal : old);
            }
          };

          var oldNotify2 = newObj.__notify;
          newObj.__notify = function(key, value, old) {
            if (newObj.__tmpObj[key] !== value) {
              oldNotify2(key, value, old);
              var oldVal = obj[key];
              obj.__notify(key, value, oldVal !== undefined ? oldVal : old);
            }
          };

          return obj;
        }
      },
      'oldState': {
        'value': oldObj,
        'writable': false,
        'enumerable': false
      }
    });

    for (var key in obj) {
      Object.defineProperty(newObj, key, {
        configurable: false,
        enumerable: true,
        get: makeGetter(key),
        set: makeSetter(key)
      });
      newObj[key] = obj[key];
      oldObj[key] = obj[key];
    }
    newObj.__flow(-1);
    newObj.__update();

    return newObj;
  };

  var on = function(signal, func, tag) {
    if (!Array.isArray(signal.__subscriber)) {
      throw new Error('Expecting signal');
    }

    var subscriber = {
      func: func,
      signal: signal,
      tag: tag
    };
    signal.__subscriber.push(subscriber);

    return subscriber;
  };

  var off = function(signal, info) {
    if (!Array.isArray(signal.__subscriber)) {
      throw new Error('Expecting signal');
    }

    for (var i = 0; i < signal.__subscriber.length; i++) {
      if (signal.__subscriber[i].func === info || signal.__subscriber[i].tag === info) {
        signal.__subscriber.splice(i, 1);
        break;
      }
    }
  };

  return {
    on: on,
    off: off,
    signal: signal,
    update: update,
    updateAll: updateAll
  };
})();



