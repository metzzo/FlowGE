/**
 * Created by Robert on 09.03.2015.
 */

// Components
flow.component = function(name) {
  component = flow.signal({
    parent: { },
    name: name
  });

  return component;
};


// Entity
flow.entity = function(components) {
  var componentCache = { };

  var entity = flow.signal({
    components: [],
    component: function(name) {
      return componentCache[name];
    },
    addComponent: function(component) {
      this.components = this.components.concat([ component ]);
      componentCache[component.name] = component;
    },
    removeComponent: function(component) {
      this.components.splice(this.components.indexOf(componentCache[component.name]));
      this.components = this.components.slice(0);
      componentCache[component.name] = undefined;
    }
  });

  entity.components = components;

  for (var i = 0; i < components.length; i++) {
    components[i].parent = entity;
    componentCache[components[i].name] = component;
  }

  return entity;
};
