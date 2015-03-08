/* global describe, it */
/*global expect:false, flow:false */
(function () {
  'use strict';

  describe('signal', function () {
    it('sets simple object properly', function() {
      var signal = flow.signal({
        value: 42
      });

      signal.value = 1337;

      expect(signal.value).to.equal(42);
      flow.updateAll();
      expect(signal.value).to.equal(1337);
    });

    it('subscribes properly before value was set', function() {
      var signal = flow.signal({
        value: 42
      });
      var onValue, oldValue;

      flow.on(signal, function(old) {
        onValue = this.value;
        oldValue = old.value;
      });

      signal.value = 1337;

      flow.updateAll();

      expect(onValue).to.equal(1337);
      expect(oldValue).to.equal(42);
    });

    it('subscribes properly after value was set', function() {
      var signal = flow.signal({
        value: 42
      });
      var onValue, oldValue;

      signal.value = 1337;

      flow.on(signal, function(old) {
        onValue = this.value;
        oldValue = old.value;
      });

      flow.updateAll();

      expect(onValue).to.equal(1337);
      expect(oldValue).to.equal(42);
    });

    it('propagates only 1 update, even if multiple write operations', function() {
      var signal = flow.signal({
        value: 42
      });
      var onValue = 0, oldValue;

      signal.value = 1;

      flow.on(signal, function(old) {
        onValue += this.value;
        oldValue = old.value;
      });

      signal.value = 2;
      signal.value = 3;
      signal.value = 4;

      flow.updateAll();

      expect(onValue).to.equal(4);
      expect(oldValue).to.equal(42);
    });

    it('handles nested objects properly', function() {
      var signal = flow.signal({
        values: {
          value: 42
        },
        value: 64
      });
      var onValue, oldValue;

      flow.on(signal, function(old) {
        onValue = this.values.value;
        oldValue = old.values.value;
      });

      signal.values.value = 1336;
      signal.values.value = 1337;

      flow.updateAll();

      expect(onValue).to.equal(1337);
      expect(oldValue).to.equal(42);
    });

    it('handles linked objects properly', function() {
      var linked = flow.signal({
        value: 1000
      });

      var signal1 = flow.signal({
        obj: linked
      });

      var signal2 = flow.signal({
        obj: linked
      });

      var value1, value2, oldValue1, oldValue2;

      flow.on(signal1, function(old) {
        value1 = this.obj.value;
        oldValue1 = old.obj.value;
      });

      flow.on(signal2, function(old) {
        value2 = this.obj.value;
        oldValue2 = old.obj.value;
      });

      linked.value = 1337;

      flow.updateAll();

      expect(value1).to.equal(1337);
      expect(value2).to.equal(1337);
    });

    it('handles array properly', function() {
      var signal = flow.signal({
        data: [1, 2, 3]
      });

      var value;
      flow.on(signal, function() {
        value = signal.data;
      });

      signal.data = [4, 5, 6];

      flow.updateAll();

      expect(value).to.deep.equal([4, 5, 6]);
    });
  });
})();
