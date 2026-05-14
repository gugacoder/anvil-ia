IF dbo.OBJECT_ID('sp_cr_TecnoSpeed_Consulta_Boleto') IS NOT NULL DROP PROCEDURE sp_cr_TecnoSpeed_Consulta_Boleto
GO

CREATE PROCEDURE sp_cr_TecnoSpeed_Consulta_Boleto( @COD_EMPRESA INT )
WITH ENCRYPTION 
AS
BEGIN TRY 
    SET NOCOUNT ON

	IF NOT EXISTS(SELECT 1 FROM TBintegracao_cobranca_bancaria WITH (NOLOCK) WHERE DFcod_empresa = @COD_EMPRESA AND DFstatus = 3) BEGIN
		RETURN
	END

	DECLARE	@XML XML, 
			@ID_LOG INT = 0,
			@DATA_LOG DATETIME, 
			@MSG_ERRO NVARCHAR(4000)

	-- GRAVA LOG ----------------------------------------------------------------------
	SET @DATA_LOG = (CONVERT( DATETIME, CONVERT( NVARCHAR, GETDATE(), 120 )))

	INSERT INTO TBintegracao_cobranca_bancaria_log( DFdata_log, DFxml, DFrotina )
		 SELECT @DATA_LOG, '', 'sp_cr_TecnoSpeed_Consulta_Boleto'

	IF @@ROWCOUNT <> 0 BEGIN
		SET @ID_LOG = ( SCOPE_IDENTITY() )
	END

	IF @ID_LOG = 0 BEGIN
		SET @MSG_ERRO = 'Erro ao gravar log de Integração Cobrança Bancaria'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END
	-----------------------------------------------------------------------------------

	IF dbo.OBJECT_ID( 'tempdb..#TBtemp_titulos' ) IS NOT NULL DROP TABLE #TBtemp_titulos

	SELECT DISTINCT 
		   'true' as '@omitir', 
		   'true' AS '@CaseSensitive', 
		   CASE WHEN LEFT( DFid_integracao, 1 ) = ',' THEN STUFF( DFid_integracao, 1, 1, '' ) ELSE DFid_integracao END AS idIntegracao
	  INTO #TBtemp_titulos
	  FROM (SELECT ISNULL((
			SELECT CASE WHEN ISNULL(DFid_integracao,'') = '' THEN '' ELSE ',' + CAST( DFid_integracao AS NVARCHAR(4000)) END AS 'text()' 
              FROM (SELECT DISTINCT DFid_integracao 
                      FROM TBintegracao_cobranca_bancaria WITH (NOLOCK) 
					 WHERE DFcod_empresa = @COD_EMPRESA
					   AND DFstatus = 3
				   ) AS TBtemp 
               FOR XML PATH('')), '') AS DFid_integracao
		   ) AS TBintegracao

	-- Gera XML
	SET @XML = (SELECT * FROM #TBtemp_titulos AS TBtemp
				   FOR XML PATH ('Boletos'), TYPE)
	--------------------------------------------------------------------------------------------------------------

	-- Atualiza XML na tabela de LOG
	IF @ID_LOG <> 0 AND @XML IS NOT NULL BEGIN
		UPDATE TBintegracao_cobranca_bancaria_log SET DFxml = @XML WHERE DFid_integracao_log = @ID_LOG 
	END

	IF @XML IS NULL BEGIN
		DELETE FROM TBintegracao_cobranca_bancaria_log WHERE DFid_integracao_log = @ID_LOG 
	END
	--------------------------------------------------------------------------------------------------------------

	SELECT idIntegracao FROM #TBtemp_titulos AS TBtemp

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
EXEC sp_cr_TecnoSpeed_Consulta_Boleto 1
*/
