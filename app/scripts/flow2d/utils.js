/*global flow:false */
'use strict';
/**
 * Created by Robert on 09.03.2015.
 */

flow.vec2d = function(x, y) {
  var signal = flow.signal({
    x: x,
    y: y
  });

  return signal;
};
