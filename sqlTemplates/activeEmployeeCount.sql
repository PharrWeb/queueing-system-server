USE [Tyler_Financials];


SELECT DeptCode.CodeDescription as "Department", COUNT(Emp.Number) as "Total # of Employees"

FROM [Payroll].[Employee] Emp

JOIN [Payroll].[EmployeeStatusCode] EmpStatCode ON EmpStatCode.Id = Emp.StatusCodeId
JOIN [Payroll].[DepartmentCode] DeptCode ON DeptCode.Id = Emp.DepartmentId

WHERE Emp.HireDate <= '${checkDate}' AND '${checkDate}' <= (CASE WHEN Emp.TerminationDate IS NULL THEN GetDate() ELSE Emp.TerminationDate END)
 
GROUP BY DeptCode.CodeDescription

ORDER BY DeptCode.CodeDescription ASC