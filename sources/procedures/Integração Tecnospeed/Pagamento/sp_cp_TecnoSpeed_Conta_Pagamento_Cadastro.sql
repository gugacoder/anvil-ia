IF dbo.OBJECT_ID('sp_cp_TecnoSpeed_Conta_Pagamento_Cadastro') IS NOT NULL DROP PROCEDURE sp_cp_TecnoSpeed_Conta_Pagamento_Cadastro
GO

CREATE PROCEDURE sp_cp_TecnoSpeed_Conta_Pagamento_Cadastro( @COD_EMPRESA INT)
WITH ENCRYPTION 
AS
BEGIN TRY 
    SET NOCOUNT ON

	SELECT 'true' AS '@array'
		 , 'true' AS '@omitir'
		 , DFcod_banco AS [bankCode]
		 , DFnum_agencia AS [agency]
		 , DFdig_agencia AS [agencyDigit]
		 , DFnum_conta AS [accountNumber]
		 , DFdig_conta AS [accountNumberDigit]
		 , '' AS [accountDac]
		 , DFnumero_convenio AS [convenioAgency]
		 , DFnumero_convenio AS [convenioNumber]
		 , 'int' AS 'remessaSequential/@type' 
		 , DFproxima_remessa AS [remessaSequential]
		 , NULL AS [accountType]
		 , 'boolean' AS 'accountPayment/@Type'
		 , 'false' AS [accountPayment]
		 , 'boolean' AS 'webservice/@Type'
		 , 'false' AS [webservice]
		 , '' AS [codeContract]
		 , 'boolean' AS 'ddaActived/@Type'
		 , CASE DFutiliza_DDA WHEN 1 THEN 'true' ELSE 'false' END AS [ddaActived]
		 , '' AS [clientKey]
		 , '' AS [clientSecret]
		 , '' AS [clientId]
		 , 'boolean' AS 'recipientNotification/@Type'
		 , 'false' AS [recipientNotification]
	  FROM VWtecnospeed_cadastros_pagamento AS TBcontas
	 WHERE DFcod_empresa = @COD_EMPRESA
	   AND DFid_conta NOT IN (SELECT DFid_conta FROM TBconta_pagamento_tecnospeed WITH (NOLOCK))
	   FOR XML PATH('row'), ROOT('accounts'), TYPE

    SET NOCOUNT OFF
END TRY

BEGIN CATCH

	DECLARE @ErrorNumber INT,
			@ErrorMessage NVARCHAR(4000),
			@ErrorSeverity INT,
			@ErrorState INT

    SELECT @ErrorNumber = ERROR_NUMBER(),
		   @ErrorMessage = ERROR_MESSAGE() + CHAR(13) + '%s %d.',
           @ErrorSeverity = ERROR_SEVERITY(),
           @ErrorState = ERROR_STATE()

    RAISERROR( @ErrorMessage, @ErrorSeverity, @ErrorState, N'Erro original:', @ErrorNumber )

    SET NOCOUNT OFF

END CATCH
GO
/*
EXEC sp_cp_TecnoSpeed_Conta_Pagamento_Cadastro 1
*/