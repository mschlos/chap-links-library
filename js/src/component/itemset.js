/**
 * An ItemSet holds a set of items and ranges which can be displayed in a
 * range. The width is determined by the parent of the ItemSet, and the height
 * is determined by the size of the items.
 * @param {Object} options   Available parameters:
 *                          {Component} parent
 *                          {String} [id]
 *                          {Range} range
 *                          {DataSet} data
 *                          {String | function} [className]
 * @constructor ItemSet
 * @extends Panel
 */
function ItemSet(options) {
    this.id = util.randomUUID();
    this.options = {
        orientation: 'bottom'
    };
    this.itemOptions = {
        parent: this,
        style: 'box',
        align: 'center',
        orientation: 'bottom',
        margin: 20,
        padding: 5
    };

    var me = this;
    this.data = null;
    this.listeners = {
        'add': function (event, params) {
            me._onAdd(params.items);
        },
        'update': function (event, params) {
            me._onUpdate(params.items);
        },
        'remove': function (event, params) {
            me._onRemove(params.items);
        }
    };

    this.items = {};
    this.queue = {};      // queue with items to be added/updated/removed
    this.conversion = null;

    this.setOptions(options);
}

ItemSet.prototype = new Panel();

// TODO: comment
ItemSet.prototype.setOptions = function (options) {
    if (options.data) {
        this._setData(options.data);
    }

    Component.prototype.setOptions.call(this, options);

    // TODO: ItemSet should also attach event listeners for rangechange and rangechanged, like timeaxis

    // update the item options
    var itemOptions = this.itemOptions;
    util.forEach(this.options, function (value, name) {
        itemOptions[name] = value;
    });
};

/**
 * Repaint the component
 * @return {Boolean} changed
 */
ItemSet.prototype.repaint = function () {
    var changed = 0,
        update = util.updateProperty,
        asSize = util.option.asSize,
        options = this.options,
        frame = this.frame;

    if (!frame) {
        frame = document.createElement('div');
        frame.className = 'itemset';

        if (options.className) {
            util.addClassName(frame, util.option.asString(options.className));
        }

        this.frame = frame;
        changed += 1;
    }
    if (!frame.parentNode) {
        if (!this.parent) {
            throw new Error('Cannot repaint itemset: no parent attached');
        }
        var parentContainer = this.parent.getContainer();
        if (!parentContainer) {
            throw new Error('Cannot repaint itemset: parent has no container element');
        }
        parentContainer.appendChild(frame);
        changed += 1;
    }

    changed += update(frame.style, 'height', asSize(options.height, this.height + 'px'));
    changed += update(frame.style, 'top',    asSize(options.top, '0px'));
    changed += update(frame.style, 'left',   asSize(options.left, '0px'));
    changed += update(frame.style, 'width',  asSize(options.width, '100%'));

    this._updateConversion();

    var queue = this.queue,
        data = this.data,
        items = this.items,
        dataOptions = {
            fields: ['id', 'start', 'end', 'content', 'type']
        },
        itemOptions = this.itemOptions;
    // TODO: copy options from the itemset itself?
    // TODO: make orientation dynamically changable for the items

    // show/hide added/changed/removed items
    Object.keys(queue).forEach(function (id) {
        var entry = queue[id];
        var item = entry.item;
        //noinspection FallthroughInSwitchStatementJS
        switch (entry.action) {
            case 'add':
            case 'update':
                var itemData = data.get(id, dataOptions);
                var type = itemData.type ||
                    (itemData.start && itemData.end && 'range') ||
                    'box';
                var constructor = itemTypes[type];

                // TODO: how to handle items with invalid data? hide them and give a warning? or throw an error?
                if (item) {
                    // update item
                    if (!constructor || !(item instanceof constructor)) {
                        // item type has changed, delete the item
                        item.visible = false;
                        changed += item.repaint();
                        item = null;
                    }
                    else {
                        item.data = itemData; // TODO: create a method item.setData ?
                        changed += item.repaint();
                    }
                }

                if (!item) {
                    // create item
                    if (constructor) {
                        item = new constructor(itemData, itemOptions);
                        changed += item.repaint();
                    }
                    else {
                        throw new TypeError('Unknown item type "' + type + '"');
                    }
                }

                // update lists
                items[id] = item;
                delete queue[id];
                break;

            case 'remove':
                if (item) {
                    // TODO: remove dom of the item
                    item.visible = false;
                    changed += item.repaint();
                }

                // update lists
                delete items[id];
                delete queue[id];
                break;

            default:
                console.log('Error: unknown action "' + entry.action + '"');
        }
    });

    // reposition all items
    util.forEach(this.items, function (item) {
        item.reposition();
    });

    return (changed > 0);
};

/**
 * Reflow the component
 * @return {Boolean} resized
 */
ItemSet.prototype.reflow = function () {
    var changed = 0,
        update = util.updateProperty,
        frame = this.frame;

    if (frame) {
        // calculate height from items
        // TODO: only calculate the height when height is not defined as an option
        var maxHeight = 0;
        util.forEach(this.items, function (item) {
            maxHeight = Math.max(maxHeight, item.height);
        });
        var height = maxHeight + this.itemOptions.margin;

        changed += update(this, 'top', frame.offsetTop);
        changed += update(this, 'left', frame.offsetLeft);
        changed += update(this, 'width', frame.offsetWidth);
        changed += update(this, 'height', height);
    }
    else {
        changed += 1;
    }

    this._updateConversion();

    util.forEach(this.items, function (item) {
        changed += item.reflow();
    });

    return (changed > 0);
};

/**
 * Subscribe the ItemSet to events of the current dataset
 * @private
 */
ItemSet.prototype._setData = function(data) {
    if (data && !(data instanceof DataSet)) {
        throw new TypeError('data must be of type DataSet');
    }

    // unsubscribe from current dataset
    var current = this.data;
    if (current) {
        util.forEach(this.listeners, function (callback, event) {
            current.unsubscribe(event, callback);
        });
    }

    // TODO: also support other types of data, then wrap a DataSet around it.

    // TODO: subscribe on changes in the dataset
    this.data = data;
    var id = this.id;
    util.forEach(this.listeners, function (callback, event) {
        data.subscribe(event, callback, id);
    });

    // TODO: read all data currently in the dataset
    var dataItems = data.get({filter: ['id']});
    var ids = [];
    util.forEach(dataItems, function (dataItem, index) {
        ids[index] = dataItem.id;
    });
    this._onAdd(ids);
};

/**
 * Handle updated items
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onUpdate = function(ids) {
    this._toQueue(ids, 'update');
};

/**
 * Handle changed items
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onAdd = function(ids) {
    this._toQueue(ids, 'add');
};

/**
 * Handle removed items
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onRemove = function(ids) {
    this._toQueue(ids, 'remove');
};

/**
 * Put items in the queue to be added/updated/remove
 * @param {Number[]} ids
 * @param {String} action     can be 'add', 'update', 'remove'
 */
ItemSet.prototype._toQueue = function (ids, action) {
    var items = this.items;
    var queue = this.queue;
    ids.forEach(function (id) {
        var entry = queue[id];
        if (entry) {
            // already queued, update the action of the entry
            entry.action = action;
        }
        else {
            // not yet queued, add an entry to the queue
            queue[id] = {
                item: items[id] || null,
                action: action
            };
        }
    });

    if (this.controller) {
        this.requestReflow();
    }
};

/**
 * Calculate the factor and offset to convert a position on screen to the
 * corresponding date and vice versa.
 * After the method _updateConversion is executed once, the methods _toTime
 * and _toScreen can be used.
 * @private
 */
ItemSet.prototype._updateConversion = function() {
    var range = this.options.range;
    if (range) {
        if (range.conversion) {
            this.conversion = range.conversion(this.width);
        }
        else {
            this.conversion = Range.conversion(range.start, range.end, this.width);
        }
    }
};

/**
 * Convert a position on screen (pixels) to a datetime
 * Before this method can be used, the method _updateConversion must be
 * executed once.
 * @param {int}     x    Position on the screen in pixels
 * @return {Date}   time The datetime the corresponds with given position x
 * @private
 */
ItemSet.prototype._toTime = function(x) {
    var conversion = this.conversion;
    return new Date(x / conversion.factor + conversion.offset);
};

/**
 * Convert a datetime (Date object) into a position on the screen
 * Before this method can be used, the method _updateConversion must be
 * executed once.
 * @param {Date}   time A date
 * @return {int}   x    The position on the screen in pixels which corresponds
 *                      with the given date.
 * @private
 */
ItemSet.prototype._toScreen = function(time) {
    var conversion = this.conversion;
    return (time.valueOf() - conversion.offset) * conversion.factor;
};
