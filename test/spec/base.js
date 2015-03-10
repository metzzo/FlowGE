/**
 * Created by Robert on 09.03.2015.
 */
/* global describe, it */
/*global expect:false, flow:false */
(function () {
  'use strict';

  describe('base', function () {
    it('creates entity', function() {
      var entity = flow.entity([
        flow.component('name1'),
        flow.component('name2'),
        flow.component('name3')
      ]);

      flow.updateAll();

      expect(entity.components.length).to.equal(3);
      expect(entity.components[0].parent).to.equal(entity);
      expect(entity.components[1].parent).to.equal(entity);
      expect(entity.components[2].parent).to.equal(entity);
      expect(entity.components[0].name).to.equal('name1');
      expect(entity.components[1].name).to.equal('name2');
      expect(entity.components[2].name).to.equal('name3');
    });
  });
})();
