/**
 * Create a timeline
 * @param {Object} options  // TODO: describe the available options
 * @constructor
 */
function Timeline (options) {
    var me = this;
    this.options = {
        orientation: 'bottom'
    };

    // controller
    this.controller = new Controller();

    // main panel
    if (!options.container) {
        throw new Error('No container element specified in options');
    }
    this.main = new RootPanel({
        container: options.container,
        autoResize: false,
        height: function () {
            return me.timeaxis.height + me.itemset.height;
        }
    });
    this.controller.add(this.main);

    // range
    var now = moment().minutes(0).seconds(0).milliseconds(0);
    var start = options.start && options.start.valueOf() || now.clone().add('days', -3).valueOf();
    var end = options.end && options.end.valueOf() || moment(start).clone().add('days', 7).valueOf();
    // TODO: if start and end are not provided, calculate range from the dataset
    this.range = new Range({
        start: start,
        end: end
    });
    this.range.listen(this.main, 'move', 'horizontal');
    this.range.listen(this.main, 'zoom', 'horizontal');

    // time axis
    this.timeaxis = new TimeAxis({
        orientation: this.options.orientation,
        range: this.range,
        parent: this.main
    });
    this.controller.add(this.timeaxis);

    // items panel
    if (!options.dataset) {
        throw new Error('No dataset specified in options');
    }
    this.itemset = new ItemSet({
        orientation: this.options.orientation,
        parent: me.main,
        depends: [this.timeaxis],
        range: this.range,
        data: options.dataset
    });
    this.controller.add(this.itemset);

    this.setOptions(options);
}

/**
 * Set options
 * @param {Object} options  TODO: describe the available options
 */
Timeline.prototype.setOptions = function (options) {
    util.extend(this.options, options);

    // update options the timeaxis
    this.timeaxis.setOptions({
        orientation: this.options.orientation
    });

    // update options the itemset
    var top,
        me = this;
    if (this.options.orientation == 'top') {
        top = function () {
            return me.timeaxis.height;
        }
    }
    else {
        top = function () {
            return me.main.height - me.timeaxis.height - me.itemset.height;
        }
    }
    this.itemset.setOptions({
        orientation: this.options.orientation,
        top: top
    });

    this.controller.repaint();
};