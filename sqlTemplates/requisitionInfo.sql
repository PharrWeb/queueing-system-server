USE Tyler_Financials;
SELECT Number AS 'ID', CreatedBy, 
Description , 
FORMAT(CreatedDate, 'MM/dd/yyyy'), 
FORMAT(Amount, 'C') AS 'Amount', 
FORMAT(TaxAmount, 'C') AS 'TaxAmount',
Purchasing.PODepartment.CodeDescription AS 'Department'
FROM Purchasing.PORequisition
INNER JOIN Purchasing.PODepartment ON Purchasing.PODepartment.Id = Purchasing.PORequisition.DepartmentId
WHERE Number = '${data}'