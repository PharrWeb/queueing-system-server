USE Tyler_Financials;
SELECT DISTINCT
Purchasing.POApprovalPathApprovers.CodeDescription,
Purchasing.PORequisitionItemApprovalHistory.StatusChangeUser,
FORMAT(Purchasing.PORequisitionItemApprovalHistory.StatusChangeDate, 'MM/dd/yyyy hh:mm tt') as 'Approval Date',
FORMAT(Purchasing.PORequisitionItemApprovalHistory.StatusChangeDate, 'hh:mm tt') as 'ApprovalTime',
FORMAT(Purchasing.PORequisitionItemApprovalHistory.StatusChangeDate, 'MM/dd/yyyy') as 'DateApproved',
IIF(Purchasing.PORequisitionItemApprovalHistory.ApprovalStatusTypeValue='A','Approved','Denied') AS 'Approval Status',
Purchasing.PORequisitionItemApprovalHistory.Comment
FROM Purchasing.PORequisition
INNER JOIN Purchasing.PORequisitionItem ON Purchasing.PORequisitionItem.RequisitionId = Purchasing.PORequisition.Id
INNER JOIN Purchasing.PORequisitionItemApproval ON Purchasing.PORequisitionItemApproval.RequisitionItemId = Purchasing.PORequisitionItem.Id
LEFT OUTER JOIN Purchasing.PORequisitionItemApprovalHistory ON Purchasing.PORequisitionItemApprovalHistory.RequisitionItemApprovalId = Purchasing.PORequisitionItemApproval.Id
INNER JOIN Purchasing.POApprovalPathApprovers ON Purchasing.POApprovalPathApprovers.Id = Purchasing.PORequisitionItemApproval.ApproverId
WHERE Purchasing.PORequisition.Number LIKE '${data}' AND Purchasing.PORequisitionItemApprovalHistory.ApprovalStatusTypeValue != '' AND Purchasing.PORequisitionItemApprovalHistory.AutoApproved != 1 AND Purchasing.PORequisitionItemApprovalHistory.Comment NOT LIKE 'Reject%'
ORDER BY FORMAT(Purchasing.PORequisitionItemApprovalHistory.StatusChangeDate, 'MM/dd/yyyy hh:mm tt') ASC