namespace TfsWitExtensions.Controls.Windows
{
    using System;
    using System.Collections.Specialized;
    using System.Windows.Forms;

    using Microsoft.TeamFoundation.WorkItemTracking.Client;
    using Microsoft.TeamFoundation.WorkItemTracking.Controls;

    public class CheckboxControl : CheckBox, IWorkItemControl
    {
        public CheckboxControl()
        {
            base.ThreeState = false;
            base.Checked = false;
            base.CheckedChanged += this.TfsCheckbox_CheckedChanged;
        }

        public StringDictionary Properties { get; set; }

        public bool ReadOnly { get; set; }

        public object WorkItemDatasource { get; set; }

        public string WorkItemFieldName { get; set; }

        public event EventHandler AfterUpdateDatasource;

        public event EventHandler BeforeUpdateDatasource;

        public void SetSite(IServiceProvider serviceProvider)
        {
            serviceProvider.GetService(typeof(IWorkItemControlHost));
        }

        public void Clear()
        {
            base.Checked = false;
        }

        public void FlushToDatasource()
        {
            if ((this.WorkItemDatasource as WorkItem) == null || (this.WorkItemDatasource as WorkItem).Fields[this.WorkItemFieldName] == null)
            {
                return;
            }
            (this.WorkItemDatasource as WorkItem).Fields[this.WorkItemFieldName].Value = base.Checked ? "True" : "False";
        }

        public void InvalidateDatasource()
        {
            if ((this.WorkItemDatasource as WorkItem) == null || (this.WorkItemDatasource as WorkItem).Fields[this.WorkItemFieldName] == null || (this.WorkItemDatasource as WorkItem).Fields[this.WorkItemFieldName].Value == null)
            {
                return;
            }
            base.Checked = (this.WorkItemDatasource as WorkItem).Fields[this.WorkItemFieldName].Value.ToString() == "True";
        }

        private void TfsCheckbox_CheckedChanged(object sender, EventArgs e)
        {
            this.FlushToDatasource();
        }
    }
}