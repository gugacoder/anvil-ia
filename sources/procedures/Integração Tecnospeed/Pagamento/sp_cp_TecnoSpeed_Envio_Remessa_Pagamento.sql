IF dbo.OBJECT_ID('sp_cp_TecnoSpeed_Envio_Remessa_Pagamento') IS NOT NULL DROP PROCEDURE sp_cp_TecnoSpeed_Envio_Remessa_Pagamento
GO

CREATE PROCEDURE sp_cp_TecnoSpeed_Envio_Remessa_Pagamento( @ID_INTEGRACAO INT )
WITH ENCRYPTION 
AS
BEGIN TRY 
    SET NOCOUNT ON

	IF NOT EXISTS(SELECT 1 FROM TBintegracao_cobranca_bancaria_pagamento WITH (NOLOCK) 
				   WHERE DFid_integracao_cobranca_bancaria_pagamento = @ID_INTEGRACAO 
				     AND DFstatus = 1
					 AND DFid_titulo_pagar_envio_cobranca_bancaria IS NOT NULL) 
	BEGIN
		RETURN
	END

	DECLARE	@XML XML, 
			@ID_LOG INT = 0,
			@DATA_LOG DATETIME, 
			@MSG_ERRO NVARCHAR(4000), 
			@TRANCOUNT SMALLINT

	-- GRAVA LOG ----------------------------------------------------------------------
	SET @DATA_LOG = (CONVERT( DATETIME, CONVERT( NVARCHAR, GETDATE(), 120 )))

	INSERT INTO TBintegracao_cobranca_bancaria_pagamento_log( DFdata_log, DFxml, DFrotina )
		 SELECT @DATA_LOG, '', 'sp_cp_TecnoSpeed_Envio_Remessa_Pagamento'

	IF @@ROWCOUNT <> 0 BEGIN
		SET @ID_LOG = ( SCOPE_IDENTITY() )
	END

	IF @ID_LOG = 0 BEGIN
		SET @MSG_ERRO = 'Erro ao gravar log de Integração Cobrança Pagamento'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END
	-----------------------------------------------------------------------------------

	BEGIN TRANSACTION
	SAVE TRANSACTION Inclusao_Pagamento

	IF dbo.OBJECT_ID( 'tempdb..#TBtemp_titulos' ) IS NOT NULL DROP TABLE #TBtemp_titulos

	SELECT DISTINCT 
		   CASE WHEN TBtitulo_previsao.DFid_titulo_pagar IS NOT NULL 
				THEN 'PAGAMENTO TITULO Nº ' + DFnumero_titulo + CASE WHEN ISNULL(DFcomplemento,'') = '' THEN '' ELSE '-' + DFcomplemento END
				ELSE 'TRANSFERENCIA Nº ' + DFnumero_titulo 
				END AS DFdescricao_pagto
		 , CASE TBtitulo_previsao.DFtipo_pagamento WHEN 'BOL' THEN 'BOLETO' WHEN 'DEP' THEN 'DEPOSITO' ELSE TBtitulo_previsao.DFtipo_pagamento END AS DFtipo_pagto
		 , TBintegracao_titulo.*
		 , TBconta_pagamento_tecnospeed.DFcod_conta_pagto_tecno
	  INTO #TBtemp_titulos
	  FROM TBintegracao_cobranca_bancaria_pagamento AS TBintegracao WITH (NOLOCK)
	 INNER JOIN TBintegracao_cobranca_bancaria_pagamento_titulo_pagar AS TBintegracao_titulo WITH (NOLOCK)
		ON TBintegracao.DFid_titulo_pagar_envio_cobranca_bancaria = TBintegracao_titulo.DFid_titulo_pagar_envio_cobranca_bancaria 
	 INNER JOIN TBtitulo_pagar_envio_cobranca_bancaria AS TBtitulo_cobranca_pagamento WITH (NOLOCK)
		ON TBintegracao.DFid_titulo_pagar_envio_cobranca_bancaria = TBtitulo_cobranca_pagamento.DFid_titulo_pagar_envio_cobranca_bancaria 
	 INNER JOIN TBtitulo_pagar_envio_cobranca_bancaria_previsao AS TBtitulo_previsao WITH (NOLOCK)
		ON TBtitulo_cobranca_pagamento.DFid_titulo_pagar_envio_cobranca_bancaria_previsao = TBtitulo_previsao.DFid_titulo_pagar_envio_cobranca_bancaria_previsao 
	 INNER JOIN VWtecnospeed_cadastros_pagamento WITH (NOLOCK)
		ON TBtitulo_cobranca_pagamento.DFcod_configuracao_carteira_pagamento = VWtecnospeed_cadastros_pagamento.DFcod_configuracao_carteira_pagamento
	 INNER JOIN TBconta_pagamento_tecnospeed WITH (NOLOCK)
		ON VWtecnospeed_cadastros_pagamento.DFid_conta = TBconta_pagamento_tecnospeed.DFid_conta 
	 WHERE TBintegracao.DFstatus = 1
	   AND TBintegracao.DFid_integracao_cobranca_bancaria_pagamento = @ID_INTEGRACAO

	-- Gera XML
	SET @XML = (
		SELECT 'true' as '@omitir' 
			 , 'true' AS '@CaseSensitive' 
			 , DFcod_conta_pagto_tecno AS [accountHash]
			 , DFtipo_servico AS [paymentType]
			 , DFtipo_pagamento AS [paymentForm]
			 , DFdescricao_pagto + ' (' + DFtipo_pagto + ')' AS [description]
			 , DFcodigo_barras AS [barcode]
			 , CAST(DFdata_vencimento AS DATE) AS [dueDate]
			 , CAST(DFdata_pagto AS DATE) AS [paymentDate]
			 , DFvalor AS [nominalAmount]
			 , DFvlr_abatimento AS [discountAmount]
			 , DFvlr_juros_multa AS [feeAmount]
			 , DFvlr_liquido AS [amount]
			 , '00' AS [movimentCode]	--00 - Inclusão
			 , DFcod_compensacao_doc_ted AS [compensation]
			 , 'CC' AS [complementaryCode]
			 , NULL AS [installmentForm]
			 , NULL AS [periodicDueDate]
			 , CASE DFcod_banco WHEN 104 THEN 0 ELSE NULL END AS [compromiseType]  --Utilizado somente para o banco Caixa
			 , CASE DFcod_banco WHEN 104 THEN 0 ELSE NULL END AS [transmissionParam]  --Utilizado somente para o banco Caixa
			 , DFnome_cli_forn_empr AS [avalistaName]
			 , DFcnpj_cpf AS [avalistaCpfCnpj]
			 , (SELECT 'true' AS '@array' 
					 , DFnome_cli_forn_empr AS [name]
					 , DFcnpj_cpf AS [cpfCnpj]
					 , DFbanco_destino AS [bankCode]
					 , DFnum_agencia_destino AS [agency]
					 , DFdig_agencia_destino AS [agencyDigit]
					 , DFnum_conta_destino AS [accountNumber]
					 , DFdig_conta_destino AS [accountNumberDigit]
					 , NULL AS [accountOperation]
					 , NULL AS [accountDac]
					 , CASE WHEN DFnum_conta_destino IS NOT NULL THEN 1 ELSE NULL END AS [accountType]
					 , NULL AS [transferOptions]
					 , DFendereco_destino AS [street]
					 , '' AS [addressNumber]
					 , '' AS [addressComplement]
					 , '' AS [neighborhood]
					 , '' AS [city]
					 , '' AS [state]
					 , DFcep_destino AS [zipcode]
				   FOR XML PATH ('beneficiary'), TYPE)
		  FROM #TBtemp_titulos AS TBtemp
		   FOR XML PATH ('Pagamentos'), TYPE)
	--------------------------------------------------------------------------------------------------------------

	-- Atualiza Status para 2 (Enviado) --------------------------------------------------------------------------
	UPDATE TBintegracao_cobranca_bancaria_pagamento
	   SET DFstatus = 2
		 , DFdata_envio = (CONVERT(SMALLDATETIME, GETDATE(), 112))
		 , DFsequencia = (ISNULL(TBsequencia.DFsequencia, 0) + 1)
	  FROM TBintegracao_cobranca_bancaria_pagamento
	 CROSS JOIN (SELECT MAX(DFsequencia) AS DFsequencia
				   FROM TBintegracao_cobranca_bancaria_pagamento 
				  WHERE CAST(DFdata_envio AS DATE) = CAST(GETDATE() AS DATE)) AS TBsequencia
	 WHERE DFid_integracao_cobranca_bancaria_pagamento = @ID_INTEGRACAO
	--------------------------------------------------------------------------------------------------------------

	COMMIT TRANSACTION

	-- Atualiza XML na tabela de LOG
	IF @ID_LOG <> 0 AND @XML IS NOT NULL BEGIN
		UPDATE TBintegracao_cobranca_bancaria_pagamento_log SET DFxml = @XML WHERE DFid_integracao_log = @ID_LOG 
	END

	IF @XML IS NULL BEGIN
		DELETE FROM TBintegracao_cobranca_bancaria_pagamento_log WHERE DFid_integracao_log = @ID_LOG 
	END
	--------------------------------------------------------------------------------------------------------------

	SELECT @XML

    SET NOCOUNT OFF
END TRY

BEGIN CATCH
	DECLARE @ErrorMessage NVARCHAR(4000)

    SELECT @ErrorMessage = ERROR_MESSAGE()

	IF @TRANCOUNT <> @@TRANCOUNT BEGIN
		ROLLBACK TRANSACTION Inclusao_Pagamento
		COMMIT TRANSACTION
	END

	-- ATUALIZA ERRO NA TABELA DE LOG ------------------
	IF @ID_LOG <> 0 AND @ErrorMessage <> '' BEGIN
		UPDATE TBintegracao_cobranca_bancaria_pagamento_log SET DFdescricao_erro = @ErrorMessage WHERE DFid_integracao_log = @ID_LOG 
	END
	----------------------------------------------------

    SET NOCOUNT OFF

END CATCH
GO
/*
EXEC sp_cp_TecnoSpeed_Envio_Remessa_Pagamento 10
*/
	 