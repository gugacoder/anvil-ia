IF dbo.OBJECT_ID('sp_cr_TecnoSpeed_WebHook_Retorno') IS NOT NULL DROP PROCEDURE sp_cr_TecnoSpeed_WebHook_Retorno
GO

CREATE PROCEDURE sp_cr_TecnoSpeed_WebHook_Retorno( @XML XML )
WITH ENCRYPTION 
AS
BEGIN TRY 
    SET NOCOUNT ON

	/*
	Status: 1 À ENVIAR
			2 ENVIANDO
			3 SALVO
			4 EMITIDO
			5 REGISTRADO
			6 REJEITADO
			7 LIQUIDADO
			8 BAIXADO
			9 FALHA
	*/

	DECLARE	@ID_LOG INT = 0,
			@DATA_LOG DATETIME, 
			@MSG_ERRO NVARCHAR(4000), 
			@TRANCOUNT SMALLINT

	-- GRAVA LOG ----------------------------------------------------------------------
	SET @DATA_LOG = (CONVERT( DATETIME, CONVERT( NVARCHAR, GETDATE(), 120 )))

	INSERT INTO TBintegracao_cobranca_bancaria_log( DFdata_log, DFxml, DFrotina )
		 SELECT @DATA_LOG, @XML, 'sp_cr_TecnoSpeed_WebHook_Retorno'

	IF @@ROWCOUNT <> 0 BEGIN
		SET @ID_LOG = ( SCOPE_IDENTITY() )
	END

	IF @ID_LOG = 0 BEGIN
		SET @MSG_ERRO = 'Erro ao gravar log de Integração Cobrança Bancaria'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END
	-----------------------------------------------------------------------------------

	SET @TRANCOUNT = @@TRANCOUNT

	IF dbo.OBJECT_ID( 'tempdb..#TBtemp_webhook' ) IS NOT NULL DROP TABLE #TBtemp_webhook

	SELECT IDENTITY(INT,1,1) AS DFid_notificacao
		 , ref.value('(*[lower-case(local-name())="idintegracao"])[1]', 'nvarchar(20)') AS DFid_integracao
		 , ref.value('(*[lower-case(local-name())="situacao"])[1]', 'nvarchar(20)') AS DFsituacao
		 , ref.value('(*[lower-case(local-name())="titulonossonumero"])[1]', 'nvarchar(20)') AS DFnosso_numero
	  INTO #TBtemp_webhook
	  FROM @XML.nodes('//parametros/titulo') XML( ref )

	IF NOT EXISTS(SELECT 1 FROM #TBtemp_webhook) BEGIN
		SET @MSG_ERRO = 'Nenhum registro foi encontrado no XML!'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END

	BEGIN TRANSACTION
	SAVE TRANSACTION WebHook

	-- Atualiza status de REGISTRADO
	UPDATE TBintegracao_cobranca_bancaria
	   SET DFstatus = CASE TBtemp.DFsituacao 
						   WHEN 'REGISTRADO' THEN 5
						   WHEN 'REJEITADO'  THEN 6
						   WHEN 'LIQUIDADO'  THEN 7
						   WHEN 'BAIXADO'	 THEN 8
					   END
		 , DFconsultar = 1
	  FROM TBintegracao_cobranca_bancaria
	 INNER JOIN #TBtemp_webhook AS TBtemp
		ON TBintegracao_cobranca_bancaria.DFid_integracao = TBtemp.DFid_integracao

	SELECT 'sucesso' FOR XML PATH ('status'), TYPE
	
	COMMIT TRANSACTION

    SET NOCOUNT OFF
END TRY

BEGIN CATCH
	DECLARE @ErrorMessage NVARCHAR(4000)

    SELECT @ErrorMessage = ERROR_MESSAGE()

	IF @TRANCOUNT <> @@TRANCOUNT BEGIN
		ROLLBACK TRANSACTION WebHook
		COMMIT TRANSACTION
	END

	-- ATUALIZA ERRO NA TABELA DE LOG ------------------
	IF @ID_LOG <> 0 AND @ErrorMessage <> '' BEGIN
		UPDATE TBintegracao_cobranca_bancaria_log
		   SET DFdescricao_erro = @ErrorMessage
		 WHERE DFid_integracao_log = @ID_LOG 
	END
	----------------------------------------------------

    SET NOCOUNT OFF
END CATCH
GO
