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
    for (var i = oldChanged.length - 1; i >= 0; i--) {
      var change = oldChanged[i];
      change.__update(lastUpdateId);
    }
  };

  var updateAll = function() {
    do {
      update();
    } while (changed.length > 0);
  };

  var makePrimitiveSetter = function(key) {
    return function (value) {
      this.__notify(key, value);
    };
  };

  var makeObjectSetter = function(key) {
    return function(value) {
      if (!value.__subscriber) {
        value = signal(value);
      }

      this.__notify(key, value);
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
      '__update': {
        'writable': false,
        'value': function(lastUpdateId) {
          if (newObj.__dirty && newObj.__lastUpdated <= lastUpdateId) {
            newObj.__lastUpdated = 0;

            newObj.__snapshot();

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
          if (key !== undefined) {
            tmpObj[key] = value;
            oldObj[key] = old !== undefined ? old : newObj.__target[key];
          }

          newObj.__dirty = true;
          changed.push(newObj);
        },
        'writable': true,
        'enumerable': false
      },
      '__snapshot': {
        'value': function() {
          if (newObj.__dirty === false) {
            return;
          }

          newObj.__dirty = false;

          for (var key in tmpObj) {
            var value = tmpObj[key];
            if (value !== undefined) {
              // add listener stuff
              if (value.__subscriber) {
                // TODO: test this code path - because it's quite important that this works without mem leaks
                // remove old listener
                if (oldObj[key].__subscriber) {
                  flow.off(oldObj[key], newObj);
                }
                // add new listener
                flow.on(value, makeLinkListener(key, this), newObj);
              }

              newObj.__target[key] = value;
              tmpObj[key] = undefined;
            }
          }
        },
        'writable': false,
        'enumerable': false
      },
      'link': {
        'writable': false,
        'enumerable': false,
        'value': function(obj) {
          for (var key in newObj) {
            if (obj[key] === undefined) {
              obj[key] = newObj[key];
            }
          }

          /*for (var key in obj) {
            if (newObj[key] === undefined) {
              newObj[key] = obj[key];
            }
          }*/


          if (!obj.__subscriber) {
            obj = flow.signal(obj);
          }

          // proxy all changes between objects
          var oldNotify = obj.__notify;
          obj.__notify = function(key, value, old) {
            if (obj.__tmpObj[key] !== value) {
              oldNotify(key, value, old);
              newObj.__notify(key, value, old);
            }
          };

          var oldNotify2 = newObj.__notify;
          newObj.__notify = function(key, value, old) {
            if (newObj.__tmpObj[key] !== value) {
              oldNotify2(key, value, old);
              obj.__notify(key, value, old);
            }
          };

          return obj;
        }
      }
    });

    var makeLinkListener = function(key, obj) {
      return function (old) {
        this.__notify(key, obj, old);
      };
    };

    var makeChangeBubbling = function(obj, key) {
      flow.on(obj[key], function(old) {
        newObj.__notify(key, this, old);
      });
    };

    for (var key in obj) {
      var type = typeof obj[key];
      var setter, getter = makeGetter;
      if (type === 'string' || type === 'number' || type === 'boolean' || type === 'null' || type === 'undefined') {
        setter = makePrimitiveSetter;
      } else if (Array.isArray(obj[key])) {
        setter = makePrimitiveSetter;
      } else if (type === 'object') {
        if (!obj[key].__subscriber) {
          // raw object => make into signal
          obj[key] = signal(obj[key]);
        }
        makeChangeBubbling(obj, key);
        setter = makeObjectSetter;
      } else if (type === 'function') {
        setter = makePrimitiveSetter;
      } else {
        throw new Error('Cannot make signal of type '+type);
      }

      Object.defineProperty(newObj, key, {
        configurable: false,
        enumerable: true,
        get: getter(key),
        set: setter(key)
      });

      oldObj[key] = newObj[key];
    }

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



