IF dbo.OBJECT_ID('sp_cr_TecnoSpeed_Cancelar_Boleto_Banco') IS NOT NULL DROP PROCEDURE sp_cr_TecnoSpeed_Cancelar_Boleto_Banco
GO

CREATE PROCEDURE sp_cr_TecnoSpeed_Cancelar_Boleto_Banco( @ID_INTEGRACAO NVARCHAR(20) )
WITH ENCRYPTION 
AS
BEGIN TRY 
    SET NOCOUNT ON

	IF NOT EXISTS(SELECT 1 FROM TBintegracao_cobranca_bancaria WITH (NOLOCK) WHERE DFid_integracao = @ID_INTEGRACAO AND DFstatus = 5 AND DFid_titulo_receber_envio_cobranca_bancaria IS NULL AND DFconsultar = 0) BEGIN
		RETURN
	END

	DECLARE	@XML XML, 
			@ID_LOG INT = 0, 
			@DATA_LOG DATETIME, 
			@MSG_ERRO NVARCHAR(4000)

	-- GRAVA LOG ----------------------------------------------------------------------
	SET @DATA_LOG = (CONVERT( DATETIME, CONVERT( NVARCHAR, GETDATE(), 120 )))

	INSERT INTO TBintegracao_cobranca_bancaria_log( DFdata_log, DFxml, DFrotina )
		 SELECT @DATA_LOG, '', 'sp_cr_TecnoSpeed_Cancelar_Boleto_Banco'

	IF @@ROWCOUNT <> 0 BEGIN
		SET @ID_LOG = ( SCOPE_IDENTITY() )
	END

	IF @ID_LOG = 0 BEGIN
		SET @MSG_ERRO = 'Erro ao gravar log de Integração Cobrança Bancaria'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END
	-----------------------------------------------------------------------------------

	SET @XML = (
		SELECT 'true' AS '@omitir' 
				, (SELECT DISTINCT 
						'true' AS 'Boleto/@array',
						DFid_integracao AS Boleto
					FROM TBintegracao_cobranca_bancaria WITH (NOLOCK) 
					WHERE DFid_integracao = @ID_INTEGRACAO
					AND DFstatus= 5
					AND DFid_titulo_receber_envio_cobranca_bancaria IS NULL
					AND DFconsultar = 0
					FOR XML PATH(''), TYPE) 
			FOR XML PATH('Boleto'), TYPE) 

	-- Atualiza XML na tabela de LOG
	IF @ID_LOG <> 0 AND @XML IS NOT NULL BEGIN
		UPDATE TBintegracao_cobranca_bancaria_log SET DFxml = @XML WHERE DFid_integracao_log = @ID_LOG 
	END

	IF @XML IS NULL BEGIN
		DELETE FROM TBintegracao_cobranca_bancaria_log WHERE DFid_integracao_log = @ID_LOG 
	END
	--------------------------------------------------------------------------------------------------------------

	SELECT @XML

    SET NOCOUNT OFF
END TRY

BEGIN CATCH

	DECLARE @ErrorMessage NVARCHAR(4000)

    SELECT @ErrorMessage = ERROR_MESSAGE()

	-- ATUALIZA ERRO NA TABELA DE LOG ------------------
	IF @ID_LOG <> 0 AND @ErrorMessage <> '' BEGIN
		UPDATE TBintegracao_cobranca_bancaria_log SET DFdescricao_erro = @ErrorMessage WHERE DFid_integracao_log = @ID_LOG 
	END
	----------------------------------------------------

    SET NOCOUNT OFF

END CATCH
GO
/*
EXEC sp_cr_TecnoSpeed_Cancelar_Boleto_Banco 1
*/
