IF dbo.OBJECT_ID('sp_cr_TecnoSpeed_Consulta_Impressao') IS NOT NULL DROP PROCEDURE sp_cr_TecnoSpeed_Consulta_Impressao
GO

CREATE PROCEDURE sp_cr_TecnoSpeed_Consulta_Impressao( @ID_INTEGRACAO NVARCHAR(20) )
WITH ENCRYPTION 
AS
BEGIN TRY 
    SET NOCOUNT ON

	IF NOT EXISTS(SELECT 1 FROM TBintegracao_cobranca_bancaria WITH (NOLOCK) WHERE DFid_integracao = @ID_INTEGRACAO AND DFstatus IN (4,5)) BEGIN
		RETURN
	END

	DECLARE	@XML XML, 
			@ID_LOG INT = 0, 
			@DATA_LOG DATETIME, 
			@MSG_ERRO NVARCHAR(4000)

	-- GRAVA LOG ----------------------------------------------------------------------
	SET @DATA_LOG = (CONVERT( DATETIME, CONVERT( NVARCHAR, GETDATE(), 120 )))

	INSERT INTO TBintegracao_cobranca_bancaria_log( DFdata_log, DFxml, DFrotina )
		 SELECT @DATA_LOG, '', 'sp_cr_TecnoSpeed_Consulta_Impressao'

	IF @@ROWCOUNT <> 0 BEGIN
		SET @ID_LOG = ( SCOPE_IDENTITY() )
	END

	IF @ID_LOG = 0 BEGIN
		SET @MSG_ERRO = 'Erro ao gravar log de Integração Cobrança Bancaria'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END
	-----------------------------------------------------------------------------------

	IF dbo.OBJECT_ID( 'tempdb..#TBtemp_boletos' ) IS NOT NULL DROP TABLE #TBtemp_boletos

	SET @XML = (
		SELECT 'true' AS '@CaseSensitive' 
			 , '99' AS TipoImpressao 
			 , (SELECT DISTINCT 
					   'true' AS 'Boletos/@array', 
			           DFid_integracao AS Boletos
				  FROM TBintegracao_cobranca_bancaria AS TBintegracao WITH (NOLOCK) 
				 INNER JOIN TBtitulo_receber_envio_cobranca_bancaria AS TBtitulo_cobranca_bancaria WITH (NOLOCK) 
					ON TBintegracao.DFid_titulo_receber_envio_cobranca_bancaria = TBtitulo_cobranca_bancaria.DFid_titulo_receber_envio_cobranca_bancaria 
				 WHERE DFid_integracao = @ID_INTEGRACAO 
				   AND DFstatus IN (4, 5)
				   FOR XML PATH(''), ROOT('Boletos'), TYPE) 
		   FOR XML PATH('Boleto'), TYPE) 
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
EXEC sp_cr_TecnoSpeed_Consulta_Impressao '8TVKISNHL'
*/
