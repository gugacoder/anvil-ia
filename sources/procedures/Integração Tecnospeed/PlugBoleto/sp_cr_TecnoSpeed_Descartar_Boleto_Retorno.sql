IF dbo.OBJECT_ID('sp_cr_TecnoSpeed_Descartar_Boleto_Retorno') IS NOT NULL DROP PROCEDURE sp_cr_TecnoSpeed_Descartar_Boleto_Retorno
GO

CREATE PROCEDURE sp_cr_TecnoSpeed_Descartar_Boleto_Retorno( @XML XML )
WITH ENCRYPTION 
AS
BEGIN TRY 
    SET NOCOUNT ON

	DECLARE @STATUS NVARCHAR(10)

	SELECT @STATUS = ref.value('(*[lower-case(local-name())="_status"])[1]', 'nvarchar(10)') 
	  FROM @XML.nodes('//Parametros') XML( ref )

	IF @STATUS IS NULL BEGIN
		RETURN
	END
	
	DECLARE	@ID_LOG INT = 0, 
			@DATA_LOG DATETIME, 
			@MSG_ERRO NVARCHAR(4000), 
			@TRANCOUNT SMALLINT

	-- GRAVA LOG ----------------------------------------------------------------------
	SET @DATA_LOG = (CONVERT( DATETIME, CONVERT( NVARCHAR, GETDATE(), 120 )))

	INSERT INTO TBintegracao_cobranca_bancaria_log( DFdata_log, DFxml, DFrotina )
		 SELECT @DATA_LOG, @XML, 'sp_cr_TecnoSpeed_Descartar_Boleto_Retorno'

	IF @@ROWCOUNT <> 0 BEGIN
		SET @ID_LOG = ( SCOPE_IDENTITY() )
	END

	IF @ID_LOG = 0 BEGIN
		SET @MSG_ERRO = 'Erro ao gravar log de Integração Cobrança Bancaria'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END
	-----------------------------------------------------------------------------------

	SET @TRANCOUNT = @@TRANCOUNT

	IF @STATUS <> 'SUCESSO' BEGIN	
		SET @MSG_ERRO = 'Status de Retorno diferente de SUCESSO. (' + @STATUS + ')'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END

	IF dbo.OBJECT_ID( 'tempdb..#TBtemp_boleto_sucesso' ) IS NOT NULL DROP TABLE #TBtemp_boleto_sucesso

	SELECT ref.value('(*[lower-case(local-name())="idintegracao"])[1]', 'nvarchar(20)') AS DFid_integracao
	  INTO #TBtemp_boleto_sucesso
	  FROM @XML.nodes('//Parametros/_dados/_sucesso') XML( ref )

    --------------------------------------------------------------------------------------------------------------

	-- Falhas
	IF dbo.OBJECT_ID( 'tempdb..#TBtemp_boleto_falha' ) IS NOT NULL DROP TABLE #TBtemp_boleto_falha

	SELECT ref.value('(*[lower-case(local-name())="idintegracao"])[1]', 'nvarchar(20)') AS DFid_integracao
		 , ref.value('(*[lower-case(local-name())="_erro"])[1]', 'nvarchar(200)') AS DFmsg_erro
	  INTO #TBtemp_boleto_falha
	  FROM @XML.nodes('//Parametros/_dados/_falha') XML( ref )

	IF NOT EXISTS(SELECT 1 FROM #TBtemp_boleto_sucesso) AND NOT EXISTS(SELECT 1 FROM #TBtemp_boleto_falha) BEGIN
		SET @MSG_ERRO = 'Nenhum registro foi encontrado no XML!'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END

	BEGIN TRANSACTION
	SAVE TRANSACTION Descarte_Boleto

	IF EXISTS(SELECT 1 FROM #TBtemp_boleto_sucesso) BEGIN
		DELETE FROM TBintegracao_cobranca_bancaria
		 WHERE DFid_integracao IN (SELECT DFid_integracao FROM #TBtemp_boleto_sucesso)
	END

	IF EXISTS(SELECT 1 FROM #TBtemp_boleto_falha) BEGIN
		UPDATE TBintegracao_cobranca_bancaria
		   SET DFstatus = 9
		     , DFdescricao_erro = DFmsg_erro
		  FROM TBintegracao_cobranca_bancaria
		 INNER JOIN #TBtemp_boleto_falha AS TBtemp
			ON TBintegracao_cobranca_bancaria.DFid_integracao = TBtemp.DFid_integracao 
	END

	COMMIT TRANSACTION

    SET NOCOUNT OFF
END TRY

BEGIN CATCH

	DECLARE @ErrorMessage NVARCHAR(4000)

    SELECT @ErrorMessage = ERROR_MESSAGE()

	IF @TRANCOUNT <> @@TRANCOUNT BEGIN
		ROLLBACK TRANSACTION Descarte_Boleto
		COMMIT TRANSACTION
	END

	-- ATUALIZA ERRO NA TABELA DE LOG ------------------
	IF @ID_LOG <> 0 AND @ErrorMessage <> '' BEGIN
		UPDATE TBintegracao_cobranca_bancaria_log SET DFdescricao_erro = @ErrorMessage WHERE DFid_integracao_log = @ID_LOG 
	END
	----------------------------------------------------

    SET NOCOUNT OFF

END CATCH
GO
/*
DECLARE @XML XML
SET @XML = 
 '<Parametros>
     <_status>sucesso</_status>
     <_dados>
         <_sucesso>
             <idintegracao>BJSdV7dYz</idintegracao>
         </_sucesso>
     </_dados>
 </Parametros>'
EXEC sp_cr_TecnoSpeed_Descartar_Boleto_Retorno @XML
*/
