/*
 * TFS web access extension for the MultiValue control
 * Copyright (c) 2012 Pierrick Serranne
 *
 * http://tfswitextensions.codeplex.com/
 *
 * Depends:
 *   - jQuery 1.4.2+
 *   - jQuery UI 1.8 widget factory
 *
 * Optional:
 *   - jQuery UI effects
 *   - jQuery UI position utility
 *
*/
// Register this module as "TfsWitExtensions.Controls.Web.MultiValueControl" and declare 
// dependencies on TFS.WorkItemTracking.Controls, TFS.WorkItemTracking and TFS.Core modules
TFS.module("TfsWitExtensions.Controls.Web.MultiValueControl",
    [
        "TFS.WorkItemTracking.Controls",
        "TFS.WorkItemTracking",
        "TFS.Core"
    ],
    function () {

        // module content
        var WITOM = TFS.WorkItemTracking,
            WITCONTROLS = TFS.WorkItemTracking.Controls,
            delegate = TFS.Core.delegate,
            moduleBaseUrl = TFS.getModuleBase("TfsWitExtensions.Controls.Web.MultiValueControl"),
            domElem = TFS.UI.domElem;


        // Constructor for MultiValueControl
        function MultiValueControl(container, options, workItemType) {
            this.baseConstructor.call(this, container, options, workItemType);
        }

        // MultiValueControl inherits from WorkItemControl
        MultiValueControl.inherit(WITCONTROLS.WorkItemControl, {
            _control: null,
            _extendedAllowedValues: null,
            _sortArray: [],
            _behavior: null,

            // Initialize the control UI without data (in "blank" state).
            // Framework calls this method when the control needs to render its initial UI
            // Notes: 
            //  - The work item data is NOT available at this point
            //  - Keep in mind that work item form is reused for multiple work items 
            //    by binding/unbinding the form to work item  
            _init: function () {
                this._base();

                $("<link />").attr("href", moduleBaseUrl + "jquery.multiselect.css")
                .attr("type", "text/css")
                .attr("rel", "stylesheet")
                .appendTo($("head").first());

                $("<link />").attr("href", moduleBaseUrl + "MultiValueControl.css")
                .attr("type", "text/css")
                .attr("rel", "stylesheet")
                .appendTo($("head").first());

                var myId = this._options.controlId;

                this._itemList = $(domElem('div')).attr('id', 'selectedValues-list').appendTo(this._container);
                this._control = $("<div id='" + myId + "_div' style='display: none;'><select id='" + myId + "' multiple='multiple'></select></div><div id='" + myId + "_ac' class='combo list text' style='display:none;'><div class='wrap'><input id='" + myId + "_ac_inp' style='display:none;' placeholder='Type to search...' /></div></div>").appendTo(this._container);

                $(document).ready(function () {

                    $("#" + myId).multiselect({
                        noneSelectedText: '...',
                        selectedList: 2,
                        show: "fade",
                        hide: "explode",
                        header: false,
                        minWidth: "auto"
                    });

                    $("#" + myId + "_div").hide();

                    $("#" + myId + "_ac_inp").autocomplete({
                        search: function () {
                            // custom minLength
                            var term = this.value;
                            if (term.length < 2) {
                                return false;
                            }
                        },
                        focus: function () {
                            // prevent value inserted on focus
                            return false;
                        }
                    })

                    var acTag = ($.ui.version === '1.10.2' ? 'uiAutocomplete' : 'autocomplete');
                    var itemTag = ($.ui.version === '1.10.2' ? 'ui-autocomplete-item' : 'item.autocomplete');

                    var autoComplete = $("#" + myId + "_ac_inp").data(acTag);
                    autoComplete._renderItem = function (ul, item) {

                        if (item.label.substr(0, 1) === "[")
                        {
                            item.label = item.label.substring(1, item.label.length - 1);
                            item.value = item.label;
                        }
                        return $("<li class='dropdown-input-listitem'></li>").data(itemTag, item).append($("<a class='dropdown-input-listitem-value'></a>").text(item.value)).appendTo(ul);
                    }

                    autoComplete._renderMenu = function (ul, items) {
                        var that = this;
                        $.each(items, function (index, item) {
                            that._renderItem(ul, item);
                        });
                        $(ul).addClass("multiValueControl-dropDown");
                    }

                    $("#" + myId + "_ac").hide();

                    $("#" + myId + "_ac .dropdown-input-control").addClass('combo');

                });

            },

            bind: function (workitem) {
                this.base.bind(workitem);

                var myId = this._options.controlId;
                var currentText = workitem.getField(this._fieldName).getValue() || "";

                var field = workitem.getField(this._fieldName);
                //get the behavior
                this._behavior = $(field.fieldDefinition.workItemType.form).find('[fieldname="' + field.fieldDefinition.referenceName + '"]').attr('Behavior');
                if (this._behavior) {
                    this._behavior = this._behavior.toLowerCase();
                }

                if (this._behavior === "autocomplete") {
                    var acTag = ($.ui.version === '1.10.2' ? 'uiAutocomplete' : 'autocomplete');
                    var ddTag = ($.ui.version === '1.10.2' ? 'TFS-Dropdown' : 'Dropdown');

                    var autoComplete = $("#" + myId + "_ac_inp").data(acTag);

                    var url = $(field.fieldDefinition.workItemType.form).find('[fieldname="' + field.fieldDefinition.referenceName + '"]').attr('MultiValueDataProvider');
                    if (typeof (url) !== "undefined") {
                        autoComplete.source = function (request, response) {
                            $.getJSON(url, {
                                searchPredicate: request.term
                            }, response);
                        };
                        autoComplete.options.field = this;
                    }
                    else
                    {
                        //get the allowed values and any remote data returned by the DataProvider
                        var allowedValues = this._getExtendedAllowedValues(field);

                        sourceArray = [];
                        $.each(allowedValues, function (index, val) {
                            sourceArray.push(val.data);
                        });

                        autoComplete.source = function (request, response) {
                            filteredArray = $.grep(sourceArray,function(element) {
                                return element.toLowerCase().indexOf(request.term.toLowerCase()) !== -1;
                            });
                            return response(filteredArray);
                        };
                        autoComplete.options.field = this;

                    }

                    $("#" + myId + "_ac_inp").bind("autocompleteselect", function (event, ui) {
                        var fieldX = $("#" + myId + "_ac_inp").data(acTag).options.field;
                        var value = ui.item.value; //.substring(1, ui.item.value.length - 1);
                        fieldX._onItemSelected.call(fieldX, event, value);
                        return false;
                    });

                    $("#" + myId + "_ac").show();
                    $("#" + myId + "_ac_inp").show();

                    var jqDropdown = $("#" + myId + "_ac");

                    this._itemList[0].innerHTML = "";
                    if (currentText !== "") {
                        var that = this;
                        var currentValues = currentText.split(";");
                        this._itemList[0].innerHTML = "";

                        $.each(currentValues, function (index, val) {
                            that._addSelected(val.substr(1, val.length - 2));
                        });
                    }


                } else {
                    //get the allowed values and any remote data returned by the DataProvider
                    var allowedValues = this._getExtendedAllowedValues(field);

                    $("#" + myId + "_div").show();
                    var mySelect = $("#" + myId);
                    mySelect.empty();
                    $.each(allowedValues, function (index, val) {
                        if (val.data.substr(0, 1) === "[") {
                            mySelect.append(new Option(val.data.substr(1, val.data.length - 2), val.data, false, currentText.indexOf(val.data) >= 0));
                        }
                        else {
                            mySelect.append(new Option(val.data, val.data, false, currentText.indexOf(val.data) >= 0));
                        }
                    });

                    mySelect.multiselect("refresh");
                    this._control.bind("change", delegate(this, this._onChange));

                }

            },

            unbind: function (workitem) {
                var myId = this._options.controlId;

                if (this._behavior !== "autocomplete") {
                    var mySelect = $("#" + myId);
                    this._control.unbind("change", delegate(this, this._onChange));
                    mySelect.empty();
                }
            },

            // Update the control data
            // Framework calls this method when the control needs to update itself, such as when:
            //  - work item form is bound to a specific work item
            //  - underlying field value has changed due to rules or another control logic
            invalidate: function (flushing) {
                if (this._behavior !== "autocomplete") {
                    // Get the text from the underlying field
                    var currentText = this._getField().getValue() || "";

                    //get the allowed values and any remote data returned by the DataProvider
                    var allowedValues = this._getExtendedAllowedValues(this._getField());

                    var myId = this._options.controlId;

                    // Display the text
                    var mySelect = $("#" + myId);

                    mySelect.empty();

                    $.each(allowedValues, function (index, val) {
                        mySelect.append(new Option(val.substr(1, val.length - 2), val, false, currentText.indexOf(val) >= 0));
                    });

                    mySelect.multiselect("refresh");
                }
            },

            // Clear the control data
            // Framework calls this method when the control needs to reset its state to "blank", such as when:
            //  - work item form is unbound from a specific work item
            clear: function () {
                this._control.empty();
            },

            // Handle the change event on the multi select
            // Note: This is a private method for this control
            _onChange: function () {

                var myId = this._options.controlId;

                var allValues = $("#" + myId + " :selected").map(function () { return $(this).val(); }).get();

                // Store the new value in the underlying field
                if (allValues.length === 0)
                {
                    this._getField().setValue("");
                }
                else
                {
                    this._getField().setValue("[" + allValues.join('];[') + "]");
                }

            },

            _onItemSelected: function (event, params) {
                var ddTag = ($.ui.version === '1.10.2' ? 'TFS-Dropdown' : 'Dropdown');

                var jqDropdown = $("#" + this._options.controlId + "_ac");
                var dropDownObject = jqDropdown.data(ddTag);

                if (this._getField().getValue().indexOf("[" + params + "]") === -1) {
                    this._addSelected(params);

                    var allValues = this._itemList.find(".selected-value").map(function () { return $(this).attr("title"); }).get();
                    // Store the new value in the underlying field
                    this._getField().setValue(allValues.join(';'));
                }

                $("#" + this._options.controlId + "_ac_inp").val('');

            },

            _addSelected: function (text) {

                var newItemDiv, newItemSpan;

                newItemDiv = $(domElem('div'))
                    .addClass('selected-value');

                newItemSpan = $(domElem('span'))
                    .appendTo(newItemDiv)
                    .addClass('selected-value-name')
                    .text(text);

                this._drawRemoveElement(newItemDiv);

                $('<input type="hidden" />')
                    .appendTo(newItemDiv)
                    .attr('id', 'tfid')
                    .val(text);

                newItemDiv.attr('title', '[' + text + ']');

                this._itemList.append(newItemDiv);

            },

            _drawRemoveElement: function (elem) {
                $(domElem('img'))
                    .appendTo(elem)
                    .addClass('icon')
                    .attr('id', 'remove-action')
                    .attr('src', moduleBaseUrl + "MultiValueControl16x16.png")
                    .click(delegate(this, this._onItemRemoved))
                    .accessible();
            },
            _onItemRemoved: function (event) {
                var parent, tfid, name, callbackResult;

                parent = $(event.target).closest('.selected-value');
                tfid = parent.find('#tfid').val();
                name = parent.find('.selected-value-name').text();
                this._removeValue(parent);

                var allValues = this._itemList.find(".selected-value").map(function () { return $(this).attr("title"); }).get();
                // Store the new value in the underlying field
                this._getField().setValue(allValues.join(';'));

                return false;
            },
            _removeValue: function (parent) {
                var displayName, value = parent.find('#tfid').val();
                if (value) {
                    displayName = parent.find('.selected-value-name').text();
                }
                else {
                    displayName = parent.find('#username').val();
                }
                parent.remove();
            },

            //Here we merge together, the list of values from the global list and the list of values from the DataProvider
            //This could be cached somehow to releave the server.
            _getExtendedAllowedValues: function (field) {

                var golbalValues = field.getAllowedValues();
                var allowedValues = [];

                $.each(golbalValues, function (index, val) {
                    var itemToAdd = val.substr(1, val.length - 2);
                    allowedValues.push({ data: itemToAdd, text: itemToAdd, value: itemToAdd });
                });

                var url = $(field.fieldDefinition.workItemType.form).find('[fieldname="' + field.fieldDefinition.referenceName + '"]').attr('MultiValueDataProvider');

                if (typeof url !== "undefined" && url !== '') {

                    $.ajax( 
                    {
                        type: 'GET',
                        dataType: "json",
                        async: false,
                        url: url,
                        success: function (data) {
                            $.each(data, function (index, val) {
                                //we make shure the value is not already there.
                                if ($.inArray(val, allowedValues) === -1) {
                                    var itemToAdd = val.substr(1, val.length - 2);
                                    allowedValues.push({ data: itemToAdd, text: itemToAdd, value: itemToAdd });
                                }
                            });

                        }
                    });

                }

                allowedValues.sort(function (a, b) {
                    var la = a.data.toLowerCase(), lb = b.data.toLowerCase();
                    if (la < lb) return -1;
                    if (la > lb) return 1;
                    return 0;
                });

                return allowedValues;

            }
        });

        // Register this module as a work item custom control called "MultiValueControl"
        WITCONTROLS.registerWorkItemControl("MultiValueControl", MultiValueControl);

        return {
            MultiValueControl: MultiValueControl
        };
    });

/* jshint forin:true, noarg:true, noempty:true, eqeqeq:true, boss:true, undef:true, curly:true, browser:true, jquery:true */
/*
 * jQuery MultiSelect UI Widget 1.13
 * Copyright (c) 2012 Eric Hynds
 *
 * http://www.erichynds.com/jquery/jquery-ui-multiselect-widget/
 *
 * Depends:
 *   - jQuery 1.4.2+
 *   - jQuery UI 1.8 widget factory
 *
 * Optional:
 *   - jQuery UI effects
 *   - jQuery UI position utility
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
*/
(function ($, undefined) {

    var multiselectID = 0;

    $.widget("ech.multiselect", {

        // default options
        options: {
            header: true,
            height: 175,
            minWidth: 225,
            classes: '',
            checkAllText: 'Check all',
            uncheckAllText: 'Uncheck all',
            noneSelectedText: 'Select options',
            selectedText: '# selected',
            selectedList: 0,
            show: null,
            hide: null,
            autoOpen: false,
            multiple: true,
            position: {}
        },

        _create: function () {
            var el = this.element.hide(),
                o = this.options;

            this.speed = $.fx.speeds._default; // default speed for effects
            this._isOpen = false; // assume no

            var
                button = (this.button = $('<button type="button"><span class="ui-icon ui-icon-triangle-2-n-s"></span></button>'))
                    .addClass('ui-multiselect ui-widget ui-state-default ui-corner-all')
                    .addClass(o.classes)
                    .attr({ 'title': el.attr('title'), 'aria-haspopup': true, 'tabIndex': el.attr('tabIndex') })
                    .insertAfter(el),

                buttonlabel = (this.buttonlabel = $('<span />'))
                    .html(o.noneSelectedText)
                    .appendTo(button),

                menu = (this.menu = $('<div />'))
                    .addClass('ui-multiselect-menu ui-widget ui-widget-content ui-corner-all')
                    .addClass(o.classes)
                    .appendTo(document.body),

                header = (this.header = $('<div />'))
                    .addClass('ui-widget-header ui-corner-all ui-multiselect-header ui-helper-clearfix')
                    .appendTo(menu),

                headerLinkContainer = (this.headerLinkContainer = $('<ul />'))
                    .addClass('ui-helper-reset')
                    .html(function () {
                        if (o.header === true) {
                            return '<li><a class="ui-multiselect-all" href="#"><span class="ui-icon ui-icon-check"></span><span>' + o.checkAllText + '</span></a></li><li><a class="ui-multiselect-none" href="#"><span class="ui-icon ui-icon-closethick"></span><span>' + o.uncheckAllText + '</span></a></li>';
                        } else if (typeof o.header === "string") {
                            return '<li>' + o.header + '</li>';
                        } else {
                            return '';
                        }
                    })
                    .append('<li class="ui-multiselect-close"><a href="#" class="ui-multiselect-close"><span class="ui-icon ui-icon-circle-close"></span></a></li>')
                    .appendTo(header),

                checkboxContainer = (this.checkboxContainer = $('<ul />'))
                    .addClass('ui-multiselect-checkboxes ui-helper-reset')
                    .appendTo(menu);

            // perform event bindings
            this._bindEvents();

            // build menu
            this.refresh(true);

            // some addl. logic for single selects
            if (!o.multiple) {
                menu.addClass('ui-multiselect-single');
            }
        },

        _init: function () {
            if (this.options.header === false) {
                this.header.hide();
            }
            if (!this.options.multiple) {
                this.headerLinkContainer.find('.ui-multiselect-all, .ui-multiselect-none').hide();
            }
            if (this.options.autoOpen) {
                this.open();
            }
            if (this.element.is(':disabled')) {
                this.disable();
            }
        },

        refresh: function (init) {
            var el = this.element,
                o = this.options,
                menu = this.menu,
                checkboxContainer = this.checkboxContainer,
                optgroups = [],
                html = "",
                id = el.attr('id') || multiselectID++; // unique ID for the label & option tags

            // build items
            el.find('option').each(function (i) {
                var $this = $(this),
                    parent = this.parentNode,
                    title = this.innerHTML,
                    description = this.title,
                    value = this.value,
                    inputID = 'ui-multiselect-' + (this.id || id + '-option-' + i),
                    isDisabled = this.disabled,
                    isSelected = this.selected,
                    labelClasses = ['ui-corner-all'],
                    liClasses = (isDisabled ? 'ui-multiselect-disabled ' : ' ') + this.className,
                    optLabel;

                // is this an optgroup?
                if (parent.tagName === 'OPTGROUP') {
                    optLabel = parent.getAttribute('label');

                    // has this optgroup been added already?
                    if ($.inArray(optLabel, optgroups) === -1) {
                        html += '<li class="ui-multiselect-optgroup-label ' + parent.className + '"><a href="#">' + optLabel + '</a></li>';
                        optgroups.push(optLabel);
                    }
                }

                if (isDisabled) {
                    labelClasses.push('ui-state-disabled');
                }

                // browsers automatically select the first option
                // by default with single selects
                if (isSelected && !o.multiple) {
                    labelClasses.push('ui-state-active');
                }

                html += '<li class="' + liClasses + '">';

                // create the label
                html += '<label for="' + inputID + '" title="' + description + '" class="' + labelClasses.join(' ') + '">';
                html += '<input id="' + inputID + '" name="multiselect_' + id + '" type="' + (o.multiple ? "checkbox" : "radio") + '" value="' + value + '" title="' + title + '"';

                // pre-selected?
                if (isSelected) {
                    html += ' checked="checked"';
                    html += ' aria-selected="true"';
                }

                // disabled?
                if (isDisabled) {
                    html += ' disabled="disabled"';
                    html += ' aria-disabled="true"';
                }

                // add the title and close everything off
                html += ' /><span>' + title + '</span></label></li>';
            });

            // insert into the DOM
            checkboxContainer.html(html);

            // cache some moar useful elements
            this.labels = menu.find('label');
            this.inputs = this.labels.children('input');

            // set widths
            this._setButtonWidth();
            this._setMenuWidth();

            // remember default value
            this.button[0].defaultValue = this.update();

            // broadcast refresh event; useful for widgets
            if (!init) {
                this._trigger('refresh');
            }
        },

        // updates the button text. call refresh() to rebuild
        update: function () {
            var o = this.options,
                $inputs = this.inputs,
                $checked = $inputs.filter(':checked'),
                numChecked = $checked.length,
                value;

            if (numChecked === 0) {
                value = o.noneSelectedText;
            } else {
                if ($.isFunction(o.selectedText)) {
                    value = o.selectedText.call(this, numChecked, $inputs.length, $checked.get());
                } else if (/\d/.test(o.selectedList) && o.selectedList > 0 && numChecked <= o.selectedList) {
                    value = $checked.map(function () { return $(this).next().html(); }).get().join(', ');
                } else {
                    value = o.selectedText.replace('#', numChecked).replace('#', $inputs.length);
                }
            }

            this.buttonlabel.html(value);
            return value;
        },

        // binds events
        _bindEvents: function () {
            var self = this, button = this.button;

            function clickHandler() {
                self[self._isOpen ? 'close' : 'open']();
                return false;
            }

            // webkit doesn't like it when you click on the span :(
            button
                .find('span')
                .bind('click.multiselect', clickHandler);

            // button events
            button.bind({
                click: clickHandler,
                keypress: function (e) {
                    switch (e.which) {
                        case 27: // esc
                        case 38: // up
                        case 37: // left
                            self.close();
                            break;
                        case 39: // right
                        case 40: // down
                            self.open();
                            break;
                    }
                },
                mouseenter: function () {
                    if (!button.hasClass('ui-state-disabled')) {
                        $(this).addClass('ui-state-hover');
                    }
                },
                mouseleave: function () {
                    $(this).removeClass('ui-state-hover');
                },
                focus: function () {
                    if (!button.hasClass('ui-state-disabled')) {
                        $(this).addClass('ui-state-focus');
                    }
                },
                blur: function () {
                    $(this).removeClass('ui-state-focus');
                }
            });

            // header links
            this.header
                .delegate('a', 'click.multiselect', function (e) {
                    // close link
                    if ($(this).hasClass('ui-multiselect-close')) {
                        self.close();

                        // check all / uncheck all
                    } else {
                        self[$(this).hasClass('ui-multiselect-all') ? 'checkAll' : 'uncheckAll']();
                    }

                    e.preventDefault();
                });

            // optgroup label toggle support
            this.menu
                .delegate('li.ui-multiselect-optgroup-label a', 'click.multiselect', function (e) {
                    e.preventDefault();

                    var $this = $(this),
                        $inputs = $this.parent().nextUntil('li.ui-multiselect-optgroup-label').find('input:visible:not(:disabled)'),
                        nodes = $inputs.get(),
                        label = $this.parent().text();

                    // trigger event and bail if the return is false
                    if (self._trigger('beforeoptgrouptoggle', e, { inputs: nodes, label: label }) === false) {
                        return;
                    }

                    // toggle inputs
                    self._toggleChecked(
                        $inputs.filter(':checked').length !== $inputs.length,
                        $inputs
                    );

                    self._trigger('optgrouptoggle', e, {
                        inputs: nodes,
                        label: label,
                        checked: nodes[0].checked
                    });
                })
                .delegate('label', 'mouseenter.multiselect', function () {
                    if (!$(this).hasClass('ui-state-disabled')) {
                        self.labels.removeClass('ui-state-hover');
                        $(this).addClass('ui-state-hover').find('input').focus();
                    }
                })
                .delegate('label', 'keydown.multiselect', function (e) {
                    e.preventDefault();

                    switch (e.which) {
                        case 9: // tab
                        case 27: // esc
                            self.close();
                            break;
                        case 38: // up
                        case 40: // down
                        case 37: // left
                        case 39: // right
                            self._traverse(e.which, this);
                            break;
                        case 13: // enter
                            $(this).find('input')[0].click();
                            break;
                    }
                })
                .delegate('input[type="checkbox"], input[type="radio"]', 'click.multiselect', function (e) {
                    var $this = $(this),
                        val = this.value,
                        checked = this.checked,
                        tags = self.element.find('option');

                    // bail if this input is disabled or the event is cancelled
                    if (this.disabled || self._trigger('click', e, { value: val, text: this.title, checked: checked }) === false) {
                        e.preventDefault();
                        return;
                    }

                    // make sure the input has focus. otherwise, the esc key
                    // won't close the menu after clicking an item.
                    $this.focus();

                    // toggle aria state
                    $this.attr('aria-selected', checked);

                    // change state on the original option tags
                    tags.each(function () {
                        if (this.value === val) {
                            this.selected = checked;
                        } else if (!self.options.multiple) {
                            this.selected = false;
                        }
                    });

                    // some additional single select-specific logic
                    if (!self.options.multiple) {
                        self.labels.removeClass('ui-state-active');
                        $this.closest('label').toggleClass('ui-state-active', checked);

                        // close menu
                        self.close();
                    }

                    // fire change on the select box
                    self.element.trigger("change");

                    // setTimeout is to fix multiselect issue #14 and #47. caused by jQuery issue #3827
                    // http://bugs.jquery.com/ticket/3827
                    setTimeout($.proxy(self.update, self), 10);
                });

            // close each widget when clicking on any other element/anywhere else on the page
            $(document).bind('mousedown.multiselect', function (e) {
                if (self._isOpen && !$.contains(self.menu[0], e.target) && !$.contains(self.button[0], e.target) && e.target !== self.button[0]) {
                    self.close();
                }
            });

            // deal with form resets.  the problem here is that buttons aren't
            // restored to their defaultValue prop on form reset, and the reset
            // handler fires before the form is actually reset.  delaying it a bit
            // gives the form inputs time to clear.
            $(this.element[0].form).bind('reset.multiselect', function () {
                setTimeout($.proxy(self.refresh, self), 10);
            });
        },

        // set button width
        _setButtonWidth: function () {
            var width = this.element.outerWidth(),
                o = this.options;

            if (/\d/.test(o.minWidth) && width < o.minWidth) {
                width = o.minWidth;
            }

            // set widths
            this.button.width('100%'); // width );
        },

        // set menu width
        _setMenuWidth: function () {
            var m = this.menu,
                width = this.button.outerWidth() -
                    parseInt(m.css('padding-left'), 10) -
                    parseInt(m.css('padding-right'), 10) -
                    parseInt(m.css('border-right-width'), 10) -
                    parseInt(m.css('border-left-width'), 10);

            m.width(width || this.button.outerWidth());
        },

        // move up or down within the menu
        _traverse: function (which, start) {
            var $start = $(start),
                moveToLast = which === 38 || which === 37,

                // select the first li that isn't an optgroup label / disabled
                $next = $start.parent()[moveToLast ? 'prevAll' : 'nextAll']('li:not(.ui-multiselect-disabled, .ui-multiselect-optgroup-label)')[moveToLast ? 'last' : 'first']();

            // if at the first/last element
            if (!$next.length) {
                var $container = this.menu.find('ul').last();

                // move to the first/last
                this.menu.find('label')[moveToLast ? 'last' : 'first']().trigger('mouseover');

                // set scroll position
                $container.scrollTop(moveToLast ? $container.height() : 0);

            } else {
                $next.find('label').trigger('mouseover');
            }
        },

        // This is an internal function to toggle the checked property and
        // other related attributes of a checkbox.
        //
        // The context of this function should be a checkbox; do not proxy it.
        _toggleState: function (prop, flag) {
            return function () {
                if (!this.disabled) {
                    this[prop] = flag;
                }

                if (flag) {
                    this.setAttribute('aria-selected', true);
                } else {
                    this.removeAttribute('aria-selected');
                }
            };
        },

        _toggleChecked: function (flag, group) {
            var $inputs = (group && group.length) ? group : this.inputs,
                self = this;

            // toggle state on inputs
            $inputs.each(this._toggleState('checked', flag));

            // give the first input focus
            $inputs.eq(0).focus();

            // update button text
            this.update();

            // gather an array of the values that actually changed
            var values = $inputs.map(function () {
                return this.value;
            }).get();

            // toggle state on original option tags
            this.element
                .find('option')
                .each(function () {
                    if (!this.disabled && $.inArray(this.value, values) > -1) {
                        self._toggleState('selected', flag).call(this);
                    }
                });

            // trigger the change event on the select
            if ($inputs.length) {
                this.element.trigger("change");
            }
        },

        _toggleDisabled: function (flag) {
            this.button
                .attr({ 'disabled': flag, 'aria-disabled': flag })[flag ? 'addClass' : 'removeClass']('ui-state-disabled');

            var inputs = this.menu.find('input');
            var key = "ech-multiselect-disabled";

            if (flag) {
                // remember which elements this widget disabled (not pre-disabled)
                // elements, so that they can be restored if the widget is re-enabled.
                inputs = inputs.filter(':enabled')
                    .data(key, true);
            } else {
                inputs = inputs.filter(function () {
                    return $.data(this, key) === true;
                }).removeData(key);
            }

            inputs
                .attr({ 'disabled': flag, 'arial-disabled': flag })
                .parent()[flag ? 'addClass' : 'removeClass']('ui-state-disabled');

            this.element
                .attr({ 'disabled': flag, 'aria-disabled': flag });
        },

        // open the menu
        open: function (e) {
            var self = this,
                button = this.button,
                menu = this.menu,
                speed = this.speed,
                o = this.options,
                args = [];

            // bail if the multiselectopen event returns false, this widget is disabled, or is already open
            if (this._trigger('beforeopen') === false || button.hasClass('ui-state-disabled') || this._isOpen) {
                return;
            }

            var $container = menu.find('ul').last(),
                effect = o.show,
                pos = button.offset();

            // figure out opening effects/speeds
            if ($.isArray(o.show)) {
                effect = o.show[0];
                speed = o.show[1] || self.speed;
            }

            // if there's an effect, assume jQuery UI is in use
            // build the arguments to pass to show()
            if (effect) {
                args = [effect, speed];
            }

            // set the scroll of the checkbox container
            $container.scrollTop(0).height(o.height);

            // position and show menu
            if ($.ui.position && !$.isEmptyObject(o.position)) {
                o.position.of = o.position.of || button;

                menu
                    .show()
                    .position(o.position)
                    .hide();

                // if position utility is not available...
            } else {
                menu.css({
                    top: pos.top + button.outerHeight(),
                    left: pos.left
                });
            }

            // show the menu, maybe with a speed/effect combo
            $.fn.show.apply(menu, args);

            // select the first option
            // triggering both mouseover and mouseover because 1.4.2+ has a bug where triggering mouseover
            // will actually trigger mouseenter.  the mouseenter trigger is there for when it's eventually fixed
            this.labels.eq(0).trigger('mouseover').trigger('mouseenter').find('input').trigger('focus');

            button.addClass('ui-state-active');
            this._isOpen = true;
            this._trigger('open');
        },

        // close the menu
        close: function () {
            if (this._trigger('beforeclose') === false) {
                return;
            }

            var o = this.options,
                effect = o.hide,
                speed = this.speed,
                args = [];

            // figure out opening effects/speeds
            if ($.isArray(o.hide)) {
                effect = o.hide[0];
                speed = o.hide[1] || this.speed;
            }

            if (effect) {
                args = [effect, speed];
            }

            $.fn.hide.apply(this.menu, args);
            this.button.removeClass('ui-state-active').trigger('blur').trigger('mouseleave');
            this._isOpen = false;
            this._trigger('close');
        },

        enable: function () {
            this._toggleDisabled(false);
        },

        disable: function () {
            this._toggleDisabled(true);
        },

        checkAll: function (e) {
            this._toggleChecked(true);
            this._trigger('checkAll');
        },

        uncheckAll: function () {
            this._toggleChecked(false);
            this._trigger('uncheckAll');
        },

        getChecked: function () {
            return this.menu.find('input').filter(':checked');
        },

        destroy: function () {
            // remove classes + data
            $.Widget.prototype.destroy.call(this);

            this.button.remove();
            this.menu.remove();
            this.element.show();

            return this;
        },

        isOpen: function () {
            return this._isOpen;
        },

        widget: function () {
            return this.menu;
        },

        getButton: function () {
            return this.button;
        },

        // react to option changes after initialization
        _setOption: function (key, value) {
            var menu = this.menu;

            switch (key) {
                case 'header':
                    menu.find('div.ui-multiselect-header')[value ? 'show' : 'hide']();
                    break;
                case 'checkAllText':
                    menu.find('a.ui-multiselect-all span').eq(-1).text(value);
                    break;
                case 'uncheckAllText':
                    menu.find('a.ui-multiselect-none span').eq(-1).text(value);
                    break;
                case 'height':
                    menu.find('ul').last().height(parseInt(value, 10));
                    break;
                case 'minWidth':
                    this.options[key] = parseInt(value, 10);
                    this._setButtonWidth();
                    this._setMenuWidth();
                    break;
                case 'selectedText':
                case 'selectedList':
                case 'noneSelectedText':
                    this.options[key] = value; // these all needs to update immediately for the update() call
                    this.update();
                    break;
                case 'classes':
                    menu.add(this.button).removeClass(this.options.classes).addClass(value);
                    break;
                case 'multiple':
                    menu.toggleClass('ui-multiselect-single', !value);
                    this.options.multiple = value;
                    this.element[0].multiple = value;
                    this.refresh();
            }

            $.Widget.prototype._setOption.apply(this, arguments);
        }
    });

})(jQuery);
