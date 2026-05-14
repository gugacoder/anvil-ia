IF dbo.OBJECT_ID('sp_cp_TecnoSpeed_Envio_Remessa_Pagamento_Retorno') IS NOT NULL DROP PROCEDURE sp_cp_TecnoSpeed_Envio_Remessa_Pagamento_Retorno
GO

CREATE PROCEDURE sp_cp_TecnoSpeed_Envio_Remessa_Pagamento_Retorno( @ID_INTEGRACAO INT, @XML XML )
WITH ENCRYPTION 
AS
BEGIN TRY 
    SET NOCOUNT ON

	DECLARE	@ID_LOG INT = 0,
			@DATA_LOG DATETIME, 
			@TRANCOUNT SMALLINT

	DECLARE @COD_ERRO INT, 
			@MSG_ERRO NVARCHAR(MAX)

	-- GRAVA LOG ----------------------------------------------------------------------
	SET @DATA_LOG = (CONVERT( DATETIME, CONVERT( NVARCHAR, GETDATE(), 120 )))

	INSERT INTO TBintegracao_cobranca_bancaria_pagamento_log( DFdata_log, DFxml, DFrotina )
		 SELECT @DATA_LOG, @XML, 'sp_cr_TecnoSpeed_Envio_Remessa_Pagamento_Retorno'

	IF @@ROWCOUNT <> 0 BEGIN
		SET @ID_LOG = ( SCOPE_IDENTITY() )
	END

	IF @ID_LOG = 0 BEGIN
		SET @MSG_ERRO = 'Erro ao gravar log de Integração Cobrança Pagamento'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END
	-----------------------------------------------------------------------------------

	SET @TRANCOUNT = @@TRANCOUNT

	-- Sucesso
	IF dbo.OBJECT_ID( 'tempdb..#TBtemp_pagamento' ) IS NOT NULL DROP TABLE #TBtemp_pagamento

	SELECT ref.value('(*[lower-case(local-name())="uniqueid"])[1]', 'nvarchar(20)') AS DFid_integracao
		 , ref.value('(*[lower-case(local-name())="status"])[1]', 'nvarchar(10)') AS DFstatus
		 , ref.value('(*[lower-case(local-name())="accounthash"])[1]', 'nvarchar(20)') AS DFcod_conta_tecno
	  INTO #TBtemp_pagamento
	  FROM @XML.nodes('//Parametros') XML( ref )
	----------------------------------------------------------------------------------------------------------------

	-- Erros
	SELECT ref.value('(/Parametros/code)[1]', 'int') AS DFcodigo
		 , ref.value('(/Parametros/message)[1]', 'varchar(100)') AS DFmensagem
		 , ref.value('(*[lower-case(local-name())="message"])[1]', 'nvarchar(100)') AS DFmsg_erro
		 , ref.value('(*[lower-case(local-name())="internalcode"])[1]', 'nvarchar(10)') AS DFcod_erro
	  INTO #TBtemp_erros
	  FROM @XML.nodes('//Parametros/errors') XML( ref )

	SELECT TOP 1 @COD_ERRO = UPPER(DFcodigo) FROM #TBtemp_erros
	----------------------------------------------------------------------------------------------------------------

	IF NOT EXISTS(SELECT 1 FROM #TBtemp_pagamento) AND NOT EXISTS(SELECT 1 FROM #TBtemp_erros) BEGIN
		SET @MSG_ERRO = 'Nenhum registro foi encontrado no XML!'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END

	BEGIN TRANSACTION
	SAVE TRANSACTION Retorno_Pagamento

	-- Atualiza status
	IF ISNULL(@COD_ERRO,0) = 0 BEGIN
		UPDATE TBintegracao_cobranca_bancaria_pagamento 
		   SET DFstatus = 3
		     , DFconsultar = 1
			 , DFid_integracao = TBtemp.DFid_integracao
		  FROM TBintegracao_cobranca_bancaria_pagamento
		 CROSS JOIN #TBtemp_pagamento AS TBtemp
		 WHERE TBtemp.DFstatus = 'CREATED'
		   AND DFid_integracao_cobranca_bancaria_pagamento = @ID_INTEGRACAO
	END

	-- Atualiza status de Erro
	IF ISNULL(@COD_ERRO,0) <> 0 BEGIN
		UPDATE TBintegracao_cobranca_bancaria_pagamento
		   SET DFstatus = 9
		     , DFdescricao_erro = TBtemp.DFmsg_erro
		  FROM TBintegracao_cobranca_bancaria_pagamento
		 CROSS JOIN (SELECT DISTINCT (ISNULL(DFmensagem,'') + ' ' + DFerro) AS DFmsg_erro
					   FROM ( SELECT DFmensagem
								   , ( SELECT ISNULL(( 
									   SELECT CASE WHEN DFerro = '' THEN '' ELSE CAST(DFerro AS NVARCHAR(4000)) + CHAR(10) END AS 'text()' 
										 FROM (SELECT ('(' + TBtemp_group.DFcod_erro + ' - ' + TBtemp_group.DFmsg_erro + ')') AS DFerro 
												 FROM #TBtemp_erros AS TBtemp_group WITH (NOLOCK) 
												GROUP BY ('(' + TBtemp_group.DFcod_erro + ' - ' + TBtemp_group.DFmsg_erro + ')')
											  ) AS TBtemp 
										  FOR XML PATH('') ), '')) AS DFerro 
							    FROM #TBtemp_erros AS TBtemp) AS TBtemp) AS TBtemp
		 WHERE DFid_integracao_cobranca_bancaria_pagamento = @ID_INTEGRACAO
	END

	COMMIT TRANSACTION

    SET NOCOUNT OFF
END TRY

BEGIN CATCH
	DECLARE @ErrorMessage NVARCHAR(4000)

    SELECT @ErrorMessage = ERROR_MESSAGE()

	IF @TRANCOUNT <> @@TRANCOUNT BEGIN
		ROLLBACK TRANSACTION Retorno_Pagamento
		COMMIT TRANSACTION
	END

	-- ATUALIZA ERRO NA TABELA DE LOG ------------------
	IF @ID_LOG <> 0 AND @ErrorMessage <> '' BEGIN
		UPDATE TBintegracao_cobranca_bancaria_pagamento_log
		   SET DFdescricao_erro = @ErrorMessage
		 WHERE DFid_integracao_log = @ID_LOG 
	END
	----------------------------------------------------

    SET NOCOUNT OFF
END CATCH
GO
