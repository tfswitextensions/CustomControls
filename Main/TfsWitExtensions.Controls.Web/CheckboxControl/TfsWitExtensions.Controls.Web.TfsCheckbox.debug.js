TFS.module("TfsWitExtensions.Controls.Web.TfsCheckbox",
    [
        "TFS.WorkItemTracking.Controls",
        "TFS.WorkItemTracking",
        "TFS.Core"
    ], function () {
        var witOM = TFS.WorkItemTracking;
        var witControls = TFS.WorkItemTracking.Controls;
        var delegate = TFS.Core.delegate;
        // constructor
        function TfsCheckbox(container, options, workItemType) {
            this.baseConstructor.call(this, container, options, workItemType);
        }
        TfsCheckbox.inherit(witControls.WorkItemControl, {
            _control: null,
            clear: function () {
                this._control.checked = false;
            },
            invalidate: function (flushing) {
                if (this._getField().getValue() == "True"){
                    this._control.attr("checked","checked");
                }
                else{
                    this._control.removeAttr("checked");
                }
            },
            _init: function () {
                this._base();
                this._control = $("<input type='checkbox'/>").appendTo(this._container);
                var that = this;
                this._control.bind('change', function () {
                    if ($(this).is(':checked')) {
                        that._getField().setValue("True");
                    } else {
                        that._getField().setValue("False");
                    }
                });
            }
        });
        witControls.registerWorkItemControl("TfsCheckbox", TfsCheckbox);
        return { TfsCheckbox: TfsCheckbox };
    });