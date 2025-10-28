SELECT
Tyler_Financials.Purchasing.PORequisition.Number AS 'ID',
Tyler_Financials.Purchasing.PORequisition.Amount AS 'RequisitionTotalAmount',
Tyler_Financials.Purchasing.PODepartment.Code,
Tyler_Financials.Purchasing.PODepartment.CodeDescription,
Tyler_Financials.Purchasing.PORequisition.RequestedBy,
Tyler_Financials.Purchasing.PORequisition.CreatedBy,
Tyler_Financials.Purchasing.PORequisition.CreatedDate,
Tyler_Financials.Purchasing.PORequisitionItem.Description,
Tyler_Financials.Purchasing.PORequisitionItem.Units,
FORMAT(Tyler_Financials.Purchasing.PORequisitionItem.Price, 'C') AS 'Price',
FORMAT(Tyler_Financials.Purchasing.PORequisitionItem.Amount, 'C') AS 'TotalItemAmount',
Tyler_Financials.AccountsPayable.APCommodityCode.Code as 'CommodityCode',
Tyler_Financials.AccountsPayable.APCommodityCodeType_TypeDef.Caption as 'CommodityType',
Tyler_Financials.Purchasing.PORequisitionItem.SpecialInstructions,
Tyler_Financials.GeneralLedger.GLAccount.Number as 'Account_Number',
Tyler_Financials.GeneralLedger.GLAccount.Name
FROM 
Tyler_Financials.Purchasing.PORequisition full join Tyler_Financials.Purchasing.PODepartment
on
Tyler_Financials.Purchasing.PORequisition.DepartmentId = Tyler_Financials.Purchasing.PODepartment.Id
full join Tyler_Financials.Purchasing.PORequisitionItem
on 
Tyler_Financials.Purchasing.PORequisition.Id = Tyler_Financials.Purchasing.PORequisitionItem.RequisitionId
full join Tyler_Financials.Purchasing.PORequisitionItemDistribution
on Tyler_Financials.Purchasing.PORequisitionItem.Id = Tyler_Financials.Purchasing.PORequisitionItemDistribution.RequisitionItemId
full join Tyler_Financials.GeneralLedger.GLAccount
on Tyler_Financials.Purchasing.PORequisitionItemDistribution.GLAccountId = Tyler_Financials.GeneralLedger.GLAccount.Id
full join Tyler_Financials.AccountsPayable.APCommodityCode
on Tyler_Financials.Purchasing.PORequisitionItem.CommodityCodeId = Tyler_Financials.AccountsPayable.APCommodityCode.Id
full join Tyler_Financials.AccountsPayable.APCommodityCodeType_TypeDef
on Tyler_Financials.AccountsPayable.APCommodityCode.APCommodityCodeTypeDef = Tyler_Financials.AccountsPayable.APCommodityCodeType_TypeDef.TypeValue
WHERE Tyler_Financials.purchasing.PORequisition.Number = '${data}';