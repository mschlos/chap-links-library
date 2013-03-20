/**
 * @constructor Controller
 *
 * A Controller controls the reflows and repaints of all visual components
 */
function Controller () {
    this.components = {};

    this.repaintTimer = undefined;
    this.reflowTimer = undefined;
}

/**
 * Add a component to the controller
 * @param {Component} component
 */
Controller.prototype.add = function (component) {
    // validate the component
    if (component.id == undefined) {
        throw new Error('Component has no field id');
    }
    if (!(component instanceof Component)) {
        throw new TypeError('Component must be an instance of prototype Component');
    }

    // add the component
    component.controller = this;
    this.components[component.id] = component;
};

/**
 * Find components by name
 * @param {function} componentType
 * @return {Component[]} components
 */
Controller.prototype.find = function (componentType) {
    var results = [];

    util.forEach(this.components, function (component) {
        if (component instanceof componentType) {
            results.push(component);
        }
    });

    if (this instanceof componentType) {
        results.push(this);
    }

    return results;
};

/**
 * Request a reflow. The controller will schedule a reflow
 */
Controller.prototype.requestReflow = function () {
    if (!this.reflowTimer) {
        var me = this;
        this.reflowTimer = setTimeout(function () {
            me.reflowTimer = undefined;
            me.reflow();
        }, 0);
    }
};

/**
 * Request a repaint. The controller will schedule a repaint
 */
Controller.prototype.requestRepaint = function () {
    if (!this.repaintTimer) {
        var me = this;
        this.repaintTimer = setTimeout(function () {
            me.repaintTimer = undefined;
            me.repaint();
        }, 0);
    }
};

/**
 * Repaint all components
 */
Controller.prototype.repaint = function () {
    // cancel any running repaint request
    if (this.repaintTimer) {
        clearTimeout(this.repaintTimer);
        this.repaintTimer = undefined;
    }

    var done = {};

    function repaint(component, id) {
        if (!(id in done)) {
            // first repaint the components on which this component is dependent
            if (component.depends) {
                component.depends.forEach(function (dep) {
                    repaint(dep, dep.id);
                });
            }
            if (component.parent) {
                repaint(component.parent, component.parent.id);
            }

            // repaint the component itself and mark as done
            component.repaint();
            done[id] = true;
        }
    }

    util.forEach(this.components, repaint);

    // immediately repaint when needed
    if (this.reflowTimer) {
        this.reflow();
    }
    // TODO: limit the number of nested reflows/repaints, prevent loop
};

/**
 * Reflow all components
 */
Controller.prototype.reflow = function () {
    // cancel any running repaint request
    if (this.reflowTimer) {
        clearTimeout(this.reflowTimer);
        this.reflowTimer = undefined;
    }

    var done = {};

    function reflow(component, id) {
        if (!(id in done)) {
            // first reflow the components on which this component is dependent
            if (component.depends) {
                component.depends.forEach(function (dep) {
                    reflow(dep, dep.id);
                });
            }
            if (component.parent) {
                reflow(component.parent, component.parent.id);
            }

            // reflow the component itself and mark as done
            component.reflow();
            done[id] = true;
        }
    }

    util.forEach(this.components, reflow);

    // immediately repaint when needed
    if (this.repaintTimer) {
        this.repaint();
    }
    // TODO: limit the number of nested reflows/repaints, prevent loop
};
