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
      expect(oldValue1).to.equal(1000);
      expect(oldValue2).to.equal(1000);
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

    it('handles link properly', function() {
      var baseSignal = flow.signal({
        value: 42,
        value2: 48
      });

      var childSignal = baseSignal.link({
        value:1337
      });

      var value1, value2, value3;
      var oldValue1, oldValue2, oldValue3;
      flow.on(childSignal, function(old) {
        value1 = this.value;
        value3 = this.value2;

        oldValue1 = old.value;
        oldValue3 = old.value2;
      });
      flow.on(baseSignal, function(old) {
        value2 = this.value;
        oldValue2 = old.value;
      });

      childSignal.value = 100;

      flow.updateAll();

      expect(value1).to.equal(100);
      expect(value2).to.equal(100);
      expect(value3).to.equal(48);
      expect(oldValue1).to.equal(1337);
      expect(oldValue2).to.equal(42);
      expect(oldValue3).to.equal(48);
    });

    it('handles functions properly', function() {
      var signal = flow.signal({
        foo: function() {
          this.value = 1337;
        },
        value: 42
      });
      var val, oldVal;
      flow.on(signal, function(old) {
        val = this.value;
        oldVal = old.value;
      });
      signal.foo();

      flow.updateAll();

      expect(val).to.equal(1337);
      expect(oldVal).to.equal(42);
    });

    it('properly resolves values before doing data flow', function() {
      var signal1 = flow.signal({
        value1: 42
      });

      var signal2 = flow.signal({
        value2: 1337
      });

      var val1, val1old;
      var val2, val2old;
      flow.on(signal2, function(old) {
        val1 = signal1.value1;
        val1old = old.value2;
      });

      flow.on(signal1, function(old) {
        val2 = signal2.value2;
        val2old = old.value1;
      });

      signal1.value1 = 10;
      signal2.value2 = 15;

      flow.updateAll();

      expect(val1).to.equal(10);
      expect(val1old).to.equal(1337);
      expect(val2).to.equal(15);
      expect(val2old).to.equal(42);
    });
  });
})();
