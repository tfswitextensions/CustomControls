Fields associated with checkbox control should have the allowed values of True and False. For example:

      <FIELD name="Planned Work" refname="Microsoft.VSTS.Common.PlannedWork" type="String" reportable="dimension">
        <HELPTEXT>Is this a Planned work item?</HELPTEXT>
        <ALLOWEDVALUES expanditems="false">
          <LISTITEM value="True" />
          <LISTITEM value="False" />
        </ALLOWEDVALUES>
		<DEFAULT value="True" />
      </FIELD>

Then use CheckboxControl as controltype for that field in Form section, for example: 

<Control Type="CheckboxControl" FieldName="Microsoft.VSTS.Common.PlannedWork" Label="Planned Work:" LabelPosition="Left" />


Note:
For searching, CheckboxControl value is treated as a string. To search you will need to match (=) the True and False values.


-To search for a checked item in Planned Work field use this clause:
AndOr	Field	Operator	Value
And	Planned Work	=	True


-To search for a un checked item in Planned Work field use this clause:
AndOr	Field	Operator	Value
And	Planned Work	=	False