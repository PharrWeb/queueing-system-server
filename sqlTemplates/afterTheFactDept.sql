USE Tyler_Financials;
SELECT DISTINCT
Purchasing.PORequisition.Number AS 'RequisitionNumber', 
format(Purchasing.PORequisition.IssueDate, 'MM/dd/yyyy') AS 'IssuedDate',
Purchasing.PORequisition.[Description] AS 'RequisitionDescription', 
Purchasing.PORequisitionItemsCategory.VendorNumber AS 'VendorNumber',
Purchasing.PORequisitionItemsCategory.VendorName AS 'VendorName',
Purchasing.PORequisitionItemApprovalHistory.Comment,
Purchasing.PORequisitionItemApprovalHistory.StatusChangeDate AS 'ApprovalDate',
Purchasing.PODepartment.Code AS 'DepartmentCode',
Purchasing.PODepartment.CodeDescription AS 'DepartmentName'
FROM Purchasing.PORequisition 
FULL JOIN Purchasing.PORequisitionItem
ON Purchasing.PORequisition.Id = Purchasing.PORequisitionItem.RequisitionId
FULL JOIN Purchasing.PORequisitionItemApproval
ON Purchasing.PORequisitionItem.Id = Purchasing.PORequisitionItemApproval.RequisitionItemId
FULL JOIN Purchasing.PORequisitionItemApprovalHistory
ON Purchasing.PORequisitionItemApproval.Id = Purchasing.PORequisitionItemApprovalHistory.RequisitionItemApprovalId
FULL JOIN Purchasing.PORequisitionItemsCategory
ON Purchasing.PORequisitionItem.Id = Purchasing.PORequisitionItemsCategory.RequisitionItemId
FULL JOIN Purchasing.POApprovalPathApprovers
ON Purchasing.PORequisitionItemApproval.ApproverId = Purchasing.POApprovalPathApprovers.Id
FULL JOIN Purchasing.PODepartment
ON Purchasing.PODepartment.Id = Purchasing.PORequisition.DepartmentId
WHERE Purchasing.PORequisitionItemApprovalHistory.Comment LIKE '%AFTER THE FACT%'
AND Purchasing.POApprovalPathApprovers.CodeDescription LIKE 'Purchasing Staff'
AND Purchasing.PODepartment.Code LIKE '${deptCode}'