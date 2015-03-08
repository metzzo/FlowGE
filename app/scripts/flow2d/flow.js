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
      update()
    } while (changed.length > 0);
  };

  var makePrimitiveSetter = function(key) {
    return function (value) {
      this.__notify(key, value);
    };
  };

  var makeObjectSetter = function(key) {
    return function(value) {
      var subSignal = signal(value);
      subSignal.__parent = this;
      subSignal.__parentKey = key;

      this.__notify(key, subSignal);
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
    var newObj = {} ;
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
      '__parent': {
        'value': null,
        'writable': true,
        'enumerable': false
      },
      '__parentKey': {
        'value': null,
        'writable': true,
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
      '__update': {
        'writable': false,
        'value': function(lastUpdateId) {
          if (newObj.__dirty && newObj.__lastUpdated <= lastUpdateId) {
            newObj.__lastUpdated = 0;

            if (newObj.__parent !== null) {
              newObj.__parent.__update(lastUpdateId);
            } else {
              newObj.__snapshot();

              var subscriber = newObj.__subscriber;
              for (var j = 0; j < subscriber.length; j++) {
                subscriber[j].func.call(newObj, oldObj);
              }
            }

            for (var attrKey in tmpObj) {
              tmpObj[attrKey]= undefined;
            }
          }
        },
        'enumerable': false
      },
      '__notify': {
        'value': function(key, value) {
          tmpObj[key] = value;
          newObj.__dirty = true;

          if (newObj.__parent !== null) {
            newObj.__parent.__notify(newObj.__parentKey, newObj);
          }
          changed.push(newObj);
        },
        'writable': false,
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
              if (value.__parent) {
                oldObj[key] = value.__snapshot();
              } else {
                oldObj[key] = newObj.__target[key];
                newObj.__target[key] = value;
              }
              tmpObj[key] = undefined;
            }
          }

          return oldObj;
        },
        'writable': false,
        'enumerable': false
      }
    });

    var makeChangeBubbling = function(obj, key) {
      flow.on(obj[key], function(old) {
        newObj.__notify(key, this);
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
        if (obj[key].__subscriber) {
          // already a signal
          makeChangeBubbling(obj, key);
        } else {
          // raw object
          var subSignal = signal(obj[key]);
          subSignal.__parent = newObj;
          subSignal.__parentKey = key;
          obj[key] = subSignal;
        }
        setter = makeObjectSetter;
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

  var on = function(signal, func) {
    if (!Array.isArray(signal.__subscriber)) {
      throw new Error('Expecting signal');
    }

    var subscriber = {
      func: func,
      signal: signal
    };
    signal.__subscriber.push(subscriber);

    return subscriber;
  };

  return {
    on: on,
    signal: signal,
    update: update,
    updateAll: updateAll
  };
})();



