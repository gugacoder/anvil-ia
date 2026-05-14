IF dbo.OBJECT_ID('sp_cp_TecnoSpeed_Pagador_Cadastro') IS NOT NULL DROP PROCEDURE sp_cp_TecnoSpeed_Pagador_Cadastro
GO

CREATE PROCEDURE sp_cp_TecnoSpeed_Pagador_Cadastro( @COD_EMPRESA INT)
WITH ENCRYPTION 
AS
BEGIN TRY 
    SET NOCOUNT ON

	SELECT DISTINCT 
		   'true' as '@omitir',
		   DFrazao_social AS [name], 
		   DFe_mail AS [email],  
		   DFcnpj_empresa AS [cpfCnpj], 
		   DFendereco AS [street], 
		   DFnum_endereco AS [addressNumber], 
		   DFcomplemento_endereco AS [addressComplement], 
		   DFbairro AS [neighborhood], 
		   DFcidade AS [city], 
		   DFuf AS [state], 
		   DFcep AS [zipcode] 
	  FROM VWtecnospeed_cadastros_pagamento AS TBpagador
	 WHERE DFcod_empresa = @COD_EMPRESA
	   AND DFcod_empresa NOT IN (SELECT DFcod_empresa FROM TBpagador_tecnospeed WITH (NOLOCK))
	   FOR XML PATH ('Pagador'), TYPE

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
EXEC sp_cp_TecnoSpeed_Pagador_Cadastro 1
*/