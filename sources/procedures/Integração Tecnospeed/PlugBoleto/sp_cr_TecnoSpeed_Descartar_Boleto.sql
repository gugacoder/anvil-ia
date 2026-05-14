IF dbo.OBJECT_ID('sp_cr_TecnoSpeed_Descartar_Boleto') IS NOT NULL DROP PROCEDURE sp_cr_TecnoSpeed_Descartar_Boleto
GO

CREATE PROCEDURE sp_cr_TecnoSpeed_Descartar_Boleto( @COD_EMPRESA INT )
WITH ENCRYPTION 
AS
BEGIN TRY 
    SET NOCOUNT ON

	-- Excluir registros estornados e ainda não enviados ------------------------------
	DELETE FROM TBintegracao_cobranca_bancaria
	 WHERE DFcod_empresa = @COD_EMPRESA
	   AND (DFid_titulo_receber_envio_cobranca_bancaria IS NULL OR DFid_titulo_receber_envio_cobranca_bancaria NOT IN 
		    (SELECT DFid_titulo_receber_envio_cobranca_bancaria FROM TBintegracao_cobranca_bancaria_titulo_receber WITH (NOLOCK)))
	   AND DFstatus IN (1,2,9)
	-----------------------------------------------------------------------------------

	IF NOT EXISTS(SELECT 1 FROM TBintegracao_cobranca_bancaria WITH (NOLOCK) WHERE DFcod_empresa = @COD_EMPRESA AND DFid_titulo_receber_envio_cobranca_bancaria IS NULL AND DFstatus NOT IN (5,7,8)) BEGIN
		RETURN
	END

	DECLARE	@XML XML, 
			@ID_LOG INT = 0, 
			@DATA_LOG DATETIME, 
			@MSG_ERRO NVARCHAR(4000)

	-- GRAVA LOG ----------------------------------------------------------------------
	SET @DATA_LOG = (CONVERT( DATETIME, CONVERT( NVARCHAR, GETDATE(), 120 )))

	INSERT INTO TBintegracao_cobranca_bancaria_log( DFdata_log, DFxml, DFrotina )
		 SELECT @DATA_LOG, '', 'sp_cr_TecnoSpeed_Descartar_Boleto'

	IF @@ROWCOUNT <> 0 BEGIN
		SET @ID_LOG = ( SCOPE_IDENTITY() )
	END

	IF @ID_LOG = 0 BEGIN
		SET @MSG_ERRO = 'Erro ao gravar log de Integração Cobrança Bancaria'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END
	-----------------------------------------------------------------------------------
	IF EXISTS(SELECT DISTINCT DFid_integracao AS Boleto
				FROM TBintegracao_cobranca_bancaria WITH (NOLOCK) 
			   WHERE DFcod_empresa = @COD_EMPRESA
				 AND DFid_titulo_receber_envio_cobranca_bancaria IS NULL
				 AND DFstatus NOT IN (5,7,8)) BEGIN
		SET @XML = (
			SELECT 'true' AS '@omitir' 
				 , (SELECT DISTINCT 
						   'true' AS 'Boleto/@array',
						   DFid_integracao AS Boleto
					  FROM TBintegracao_cobranca_bancaria WITH (NOLOCK) 
					 WHERE DFcod_empresa = @COD_EMPRESA
					   AND DFid_titulo_receber_envio_cobranca_bancaria IS NULL
					   AND DFstatus NOT IN (5,7,8)
					   FOR XML PATH(''), TYPE) 
			   FOR XML PATH('Boleto'), TYPE) 
	END
    --------------------------------------------------------------------------------------------------------------

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
EXEC sp_cr_TecnoSpeed_Descartar_Boleto 1
*/
