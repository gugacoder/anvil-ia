IF dbo.OBJECT_ID('sp_cr_TecnoSpeed_Consulta_Boleto_Retorno') IS NOT NULL DROP PROCEDURE sp_cr_TecnoSpeed_Consulta_Boleto_Retorno
GO

CREATE PROCEDURE sp_cr_TecnoSpeed_Consulta_Boleto_Retorno( @XML XML )
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
		 SELECT @DATA_LOG, @XML, 'sp_cr_TecnoSpeed_Consulta_Boleto_Retorno'

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

	IF dbo.OBJECT_ID( 'tempdb..#TBtemp_boleto' ) IS NOT NULL DROP TABLE #TBtemp_boleto

	SELECT ref.value('(*[lower-case(local-name())="idintegracao"])[1]', 'nvarchar(20)') AS DFid_integracao
		 , ref.value('(*[lower-case(local-name())="situacao"])[1]', 'nvarchar(20)') AS DFsituacao
		 , ref.value('(*[lower-case(local-name())="motivo"])[1]', 'nvarchar(200)') AS DFmotivo

		 , ref.value('(*[lower-case(local-name())="titulocodigoreferencia"])[1]', 'int') AS DFid_titulo_receber
		 , ref.value('(*[lower-case(local-name())="titulonumerodocumento"])[1]', 'nvarchar(20)') AS DFnumero_titulo
		 , ref.value('(*[lower-case(local-name())="sacadonome"])[1]', 'nvarchar(100)') AS DFnome_cliente
		 , ref.value('(*[lower-case(local-name())="pagamentodata"])[1]', 'nvarchar(20)') AS DFdata_pagto
		 , ref.value('(*[lower-case(local-name())="pagamentodatacredito"])[1]', 'nvarchar(20)') AS DFdata_credito
		 , ref.value('(*[lower-case(local-name())="titulovalor"])[1]', 'nvarchar(20)') AS DFvalor_titulo
		 , ref.value('(*[lower-case(local-name())="pagamentovalorcredito"])[1]', 'nvarchar(20)') AS DFvalor_credito
		 , ref.value('(*[lower-case(local-name())="pagamentovalorpago"])[1]', 'nvarchar(20)') AS DFvalor_pago
		 , ref.value('(*[lower-case(local-name())="pagamentovalordesconto"])[1]', 'nvarchar(20)') AS DFvlr_desconto
		 , ref.value('(*[lower-case(local-name())="pagamentovaloracrescimos"])[1]', 'nvarchar(20)') AS DFvlr_acrescimo
		 , ref.value('(*[lower-case(local-name())="pagamentovalorabatimento"])[1]', 'nvarchar(20)') AS DFvlr_abatimento
		 , ref.value('(*[lower-case(local-name())="pagamentovaloroutrasdespesas"])[1]', 'nvarchar(20)') AS DFvlr_outras_despesas 
		 , ref.value('(*[lower-case(local-name())="pagamentovaloroutroscreditos"])[1]', 'nvarchar(20)') AS DFvlr_outros_creditos 
		 , ref.value('(*[lower-case(local-name())="pagamentovaloriof"])[1]', 'nvarchar(20)') AS DFvlr_iof 
		 , ref.value('(*[lower-case(local-name())="pagamentovalortaxacobranca"])[1]', 'nvarchar(20)') AS DFvlr_taxa 
		 , ref.value('(*[lower-case(local-name())="pagamentodatataxabancaria"])[1]', 'nvarchar(20)') AS DFdata_taxa 

		 , ref.value('(*[lower-case(local-name())="titulonossonumero"])[1]', 'nvarchar(20)') AS DFnosso_numero
		 , ref.value('(*[lower-case(local-name())="titulonossonumeroimpressao"])[1]', 'nvarchar(50)') AS DFnosso_numero_impressao
		 , ref.value('(*[lower-case(local-name())="titulocodigobarras"])[1]', 'nvarchar(50)') AS DFcodigo_barras
		 , ref.value('(*[lower-case(local-name())="atualizado"])[1]', 'nvarchar(20)') AS DFdt_atualizado
		 , ref.value('(*[lower-case(local-name())="urlboleto"])[1]', 'nvarchar(200)') AS DFurl_boleto
		 , ref.value('(*[lower-case(local-name())="urlpix"])[1]', 'nvarchar(200)') AS DFurl_pix
		 , ref.value('(*[lower-case(local-name())="emv"])[1]', 'nvarchar(2000)') AS DFcopia_cola_pix
		 , ref.value('(*[lower-case(local-name())="idimpressao"])[1]', 'nvarchar(50)') AS DFid_impressao

	  INTO #TBtemp_boleto
	  FROM @XML.nodes('//Parametros/_dados') XML( ref )

	IF NOT EXISTS(SELECT 1 FROM #TBtemp_boleto) BEGIN
		SET @MSG_ERRO = 'Nenhum registro foi encontrado no XML!'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END

	BEGIN TRANSACTION
	SAVE TRANSACTION Inclusao_Boleto

	UPDATE TBintegracao_cobranca_bancaria
	   SET DFstatus = CASE TBtemp.DFsituacao WHEN 'EMITIDO' THEN 4 WHEN 'REGISTRADO' THEN 5 WHEN 'REJEITADO' THEN 6 
											 WHEN 'LIQUIDADO' THEN 7 WHEN 'BAIXADO' THEN 8 WHEN 'FALHA' THEN 9 ELSE DFstatus END
		 , DFurl_boleto = TBtemp.DFurl_boleto
		 , DFurl_pix = TBtemp.DFurl_pix
		 , DFcopia_cola_pix = TBtemp.DFcopia_cola_pix
		 , DFdescricao_erro = CASE WHEN TBtemp.DFmotivo = '' THEN NULL 
								   WHEN TBtemp.DFsituacao = 'REGISTRADO' THEN NULL 
								   WHEN TBtemp.DFsituacao = 'LIQUIDADO' THEN NULL
								   ELSE TBtemp.DFmotivo 
							   END
		 , DFnosso_numero_impressao = TBtemp.DFnosso_numero_impressao
		 , DFid_impressao = TBtemp.DFid_impressao
		 , DFconsultar = CASE WHEN TBtemp.DFsituacao = 'EMITIDO' THEN 1 
							  WHEN TBtemp.DFsituacao = 'REGISTRADO' AND DFid_titulo_receber_envio_cobranca_bancaria IS NULL THEN 1 
							  ELSE 0 
						  END
	  FROM TBintegracao_cobranca_bancaria
	 INNER JOIN #TBtemp_boleto AS TBtemp
		ON TBintegracao_cobranca_bancaria.DFid_integracao = TBtemp.DFid_integracao

	-- Atualiza status de EMITIDO/REGISTRADO
	IF EXISTS(SELECT 1 FROM #TBtemp_boleto WHERE DFsituacao = 'EMITIDO' OR DFsituacao = 'REGISTRADO') BEGIN
		UPDATE TBtitulo_receber
		   SET DFcodigo_barras = TBtemp.DFcodigo_barras
			 , DFboleto_emitido = CASE WHEN DFboleto_online_hibrido = 1 AND DFurl_pix IS NULL THEN 0 ELSE 1 END
		  FROM TBtitulo_receber
		 INNER JOIN #TBtemp_boleto AS TBtemp
			ON TBtitulo_receber.DFid_titulo_receber = TBtemp.DFid_titulo_receber
		 INNER JOIN TBtitulo_receber_envio_cobranca_bancaria
			ON TBtitulo_receber.DFid_titulo_receber = TBtitulo_receber_envio_cobranca_bancaria.DFid_titulo_receber
		 INNER JOIN TBintegracao_cobranca_bancaria_titulo_receber
			ON TBtitulo_receber_envio_cobranca_bancaria.DFid_titulo_receber_envio_cobranca_bancaria = TBintegracao_cobranca_bancaria_titulo_receber.DFid_titulo_receber_envio_cobranca_bancaria
		 INNER JOIN TBconfiguracao_carteira_cobranca
			ON TBtitulo_receber_envio_cobranca_bancaria.DFcod_configuracao_carteira_cobranca = TBconfiguracao_carteira_cobranca.DFcod_configuracao_carteira_cobranca
		 WHERE TBtemp.DFsituacao = 'EMITIDO'
		    OR TBtemp.DFsituacao = 'REGISTRADO'
	END

	-- Atualiza status LIQUIDADO
	IF EXISTS(SELECT 1 FROM #TBtemp_boleto WHERE DFsituacao = 'LIQUIDADO') BEGIN
		
		-- Criando tebela de títulos liquidados para realizar a baixa ----------------------------------------------------------------------------------------------
		DECLARE @SQL NVARCHAR(MAX), @TBTEMP_BOLETO NVARCHAR(50)
		SET @TBTEMP_BOLETO = '##TBtemp_boleto_liquidado_' + CAST(@@SPID AS NVARCHAR)

		IF dbo.OBJECT_ID( 'tempdb..' + @TBTEMP_BOLETO) IS NOT NULL EXEC ('DROP TABLE ' + @TBTEMP_BOLETO)

		SET @SQL = +
			'SELECT DFid_titulo_receber, DFnumero_titulo, DFnome_cliente ' +
				 ', CONVERT(SMALLDATETIME, CONVERT(SMALLDATETIME, CASE WHEN DFdata_pagto = '''' THEN NULL ELSE DFdata_pagto END, 103), 112) AS DFdata_pagto ' +
				 ', CONVERT(SMALLDATETIME, CONVERT(SMALLDATETIME, CASE WHEN DFdata_credito = '''' THEN NULL ELSE DFdata_credito END, 103), 112) DFdata_credito ' +
				 ', CONVERT(DECIMAL(18,2), REPLACE(REPLACE(DFvalor_titulo,''.'',''''),'','',''.'')) AS DFvalor_titulo ' +
				 ', CONVERT(DECIMAL(18,2), REPLACE(REPLACE(DFvalor_credito,''.'',''''),'','',''.'')) AS DFvalor_credito ' +
				 ', CONVERT(DECIMAL(18,2), REPLACE(REPLACE(DFvalor_pago,''.'',''''),'','',''.'')) AS DFvalor_pago ' +
				 ', CONVERT(DECIMAL(18,2), REPLACE(REPLACE(DFvlr_desconto,''.'',''''),'','',''.'')) AS DFvlr_desconto ' +
				 ', CONVERT(DECIMAL(18,2), REPLACE(REPLACE(DFvlr_acrescimo,''.'',''''),'','',''.'')) AS DFvlr_acrescimo ' +
				 ', CONVERT(DECIMAL(18,2), REPLACE(REPLACE(DFvlr_abatimento,''.'',''''),'','',''.'')) AS DFvlr_abatimento ' +
				 ', CONVERT(DECIMAL(18,2), REPLACE(REPLACE(DFvlr_outras_despesas,''.'',''''),'','',''.'')) AS DFvlr_outras_despesas ' +
				 ', CONVERT(DECIMAL(18,2), REPLACE(REPLACE(DFvlr_outros_creditos,''.'',''''),'','',''.'')) AS DFvlr_outros_creditos ' +
				 ', CONVERT(DECIMAL(18,2), REPLACE(REPLACE(DFvlr_iof,''.'',''''),'','',''.'')) AS DFvlr_iof ' +
				 ', CONVERT(DECIMAL(18,2), REPLACE(REPLACE(DFvlr_taxa,''.'',''''),'','',''.'')) AS DFvlr_taxa ' +
				 ', CONVERT(SMALLDATETIME, CONVERT(SMALLDATETIME, CASE WHEN DFdata_taxa = '''' THEN NULL ELSE DFdata_taxa END, 103), 112) DFdata_taxa '
		SET @SQL = @SQL +
			  'INTO ' + @TBTEMP_BOLETO + ' ' +
			  'FROM #TBtemp_boleto AS TBtemp ' +
			 'WHERE DFsituacao = ''LIQUIDADO'' '
		EXEC (@SQL)
		------------------------------------------------------------------------------------------------------------------------------------------------------------

		EXEC sp_cr_Baixar_Titulo_Receber_Retorno_Cobranca @TBTEMP_BOLETO
	END

	COMMIT TRANSACTION

    SET NOCOUNT OFF
END TRY

BEGIN CATCH
	DECLARE @ErrorMessage NVARCHAR(4000)

    SELECT @ErrorMessage = ERROR_MESSAGE()

	IF @TRANCOUNT <> @@TRANCOUNT BEGIN
		ROLLBACK TRANSACTION Inclusao_Boleto
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

/*
EXEC sp_cr_TecnoSpeed_Consulta_Boleto_Retorno 
'<Parametros>
     <_status>sucesso</_status>
     <_dados>
         <_sucesso>
             <idintegracao>J973UWMQJ</idintegracao>
             <idImpressao>70a95b7f-cfb5-3186-68d9-e500f5687b53</idImpressao>
             <situacao>SALVO</situacao>
             <TituloNumeroDocumento>0123</TituloNumeroDocumento>
             <TituloNossoNumero>99</TituloNossoNumero>
             <CedenteContaCodigoBanco>756</CedenteContaCodigoBanco>
             <CedenteContaNumero>50116001</CedenteContaNumero>
             <CedenteConvenioNumero>244546</CedenteConvenioNumero>
             <TituloCodigoReferencia>21824</TituloCodigoReferencia>
         </_sucesso>
     </_dados>
</Parametros>'
*/