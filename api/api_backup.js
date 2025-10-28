const router = require("express").Router();
const sql = require("mssql");
const pool = require("../db");
require("dotenv").config();

router.post("/test", (req, res) => {
  const { data } = req.body;
  try {
    const sqlString = `USE Tyler_Financials;
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
    ORDER BY FORMAT(Purchasing.PORequisitionItemApprovalHistory.StatusChangeDate, 'MM/dd/yyyy hh:mm tt') ASC`;
    const requestDB = new sql.Request(pool);

    pool.connect(err => {
      if (err) {
        console.log(`Error at connection level`);
        res.status(500).send(err);
      }
      requestDB.query(sqlString, (err, data) => {
        if (err) {
          console.log(`Error at query level`);
          res.status(500).send(err);
        } else {
          res.status(200).send(data.recordset);
        }
      });
    });
  } catch (err) {
    console.log(`Error at route level`);
    res.status(500).send(err);
  }
});
/* END-List of Approvers-END */

pool.close();
module.exports = router;
