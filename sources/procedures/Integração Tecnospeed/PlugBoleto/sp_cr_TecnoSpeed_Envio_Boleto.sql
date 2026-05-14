IF dbo.OBJECT_ID('sp_cr_TecnoSpeed_Envio_Boleto') IS NOT NULL DROP PROCEDURE sp_cr_TecnoSpeed_Envio_Boleto
GO

CREATE PROCEDURE sp_cr_TecnoSpeed_Envio_Boleto( @COD_EMPRESA INT )
WITH ENCRYPTION 
AS
BEGIN TRY 
    SET NOCOUNT ON

	IF NOT EXISTS(SELECT 1 FROM TBintegracao_cobranca_bancaria WITH (NOLOCK) WHERE DFcod_empresa = @COD_EMPRESA AND DFstatus = 1) BEGIN
		RETURN
	END

	DECLARE	@XML XML, 
			@ID_LOG INT = 0,
			@DATA_LOG DATETIME, 
			@MSG_ERRO NVARCHAR(4000), 
			@TRANCOUNT SMALLINT

	-- GRAVA LOG ----------------------------------------------------------------------
	SET @DATA_LOG = (CONVERT( DATETIME, CONVERT( NVARCHAR, GETDATE(), 120 )))

	INSERT INTO TBintegracao_cobranca_bancaria_log( DFdata_log, DFxml, DFrotina )
		 SELECT @DATA_LOG, '', 'sp_cr_TecnoSpeed_Envio_Boleto'

	IF @@ROWCOUNT <> 0 BEGIN
		SET @ID_LOG = ( SCOPE_IDENTITY() )
	END

	IF @ID_LOG = 0 BEGIN
		SET @MSG_ERRO = 'Erro ao gravar log de Integração Cobrança Bancaria'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END
	-----------------------------------------------------------------------------------

	BEGIN TRANSACTION
	SAVE TRANSACTION Inclusao_Boleto

	IF dbo.OBJECT_ID( 'tempdb..#TBtemp_titulos' ) IS NOT NULL DROP TABLE #TBtemp_titulos

	SELECT DISTINCT 
		   'true' as '@array', 
		   'true' as '@omitir', 
		   'true' AS '@CaseSensitive', 
		   TBintegracao_titulo.DFcnpj_cpf AS SacadoCPFCNPJ, 
		   TBintegracao_titulo.DFnome_cli_forn_empr AS SacadoNome, 
		   TBintegracao_titulo.DFendereco_cliente AS SacadoEnderecoLogradouro, 
		   CASE WHEN ISNUMERIC(TBintegracao_titulo.DFcomplemento_endereco) = 0 THEN LTRIM(RTRIM(SUBSTRING(TBintegracao_titulo.DFcomplemento_endereco,1,CHARINDEX(' ',TBintegracao_titulo.DFcomplemento_endereco,1)))) ELSE TBintegracao_titulo.DFcomplemento_endereco END AS SacadoEnderecoNumero, 
		   LTRIM(RTRIM(TBintegracao_titulo.DFbairro_cliente)) AS SacadoEnderecoBairro, 
		   CAST(dbo.FORMATA_VALOR(TBintegracao_titulo.DFcep_endereco_cliente,8,0,1,'S') AS NVARCHAR(10)) AS SacadoEnderecoCep, 
		   LTRIM(RTRIM(TBintegracao_titulo.DFcidade_endereco_cliente)) AS SacadoEnderecoCidade, 
		   CASE WHEN ISNUMERIC(TBintegracao_titulo.DFcomplemento_endereco) = 0 THEN LTRIM(RTRIM(SUBSTRING(TBintegracao_titulo.DFcomplemento_endereco,CHARINDEX(' ',TBintegracao_titulo.DFcomplemento_endereco,1),LEN(TBintegracao_titulo.DFcomplemento_endereco)))) ELSE '' END AS SacadoEnderecoComplemento, 
		   LTRIM(RTRIM(TBintegracao_titulo.DFpais_endereco_cliente)) AS SacadoEnderecoPais, 
		   LTRIM(RTRIM(TBintegracao_titulo.DFuf_endereco_cliente)) AS SacadoEnderecoUf, 
		   TBintegracao_titulo.DFemail_cliente AS SacadoEmail, 
		   TBintegracao_titulo.DFtelefone_cliente AS SacadoTelefone, 
		   TBintegracao_titulo.DFcelular_cliente AS SacadoCelular, 
		   VWtecnospeed_cadastros.DFcod_banco AS CedenteContaCodigoBanco, 
		   VWtecnospeed_cadastros.DFnum_conta AS CedenteContaNumero, 
		   VWtecnospeed_cadastros.DFdig_conta AS CedenteContaNumeroDV, 
		   VWtecnospeed_cadastros.DFnumero_convenio AS CedenteConvenioNumero, 
		   VWtecnospeed_cadastros.DFcod_carteira as CedenteConvenioCarteira, 
		   TBintegracao_titulo.DFnosso_numero AS TituloNossoNumero, 
		   FORMAT(TBintegracao_titulo.DFvalor, 'n', 'pt-br') AS TituloValor, 
		   VWtecnospeed_cadastros.DFboleto_hibrido AS hibrido,
		   TBintegracao_titulo.DFnumero_titulo AS TituloNumeroDocumento, 
		   FORMAT(TBintegracao_titulo.DFdata_emissao, 'd', 'pt-br') AS TituloDataEmissao, 
		   FORMAT(TBintegracao_titulo.DFdata_vencimento, 'd', 'pt-br') AS TituloDataVencimento, 
		   'N' AS TituloAceite, 
		   '01' AS TituloDocEspecie, 
		   TBinstrucao_local_pagamento.DFdescricao AS TituloLocalPagamento, 
		   CASE TBintegracao_titulo.DFcod_banco 
				WHEN 033 THEN TBintegracao_titulo.DFinformar_desconto_santander 
				WHEN 756 THEN TBintegracao_titulo.DFinformar_desconto_sicoob
				ELSE TBintegracao_titulo.DFinformar_desconto
			END AS TituloCodDesconto, 
		   CASE WHEN TBintegracao_titulo.DFdata_limite_desconto = '00000000'
				THEN ''
				ELSE CONVERT(NVARCHAR,dbo.FORMATAR_DATA(TBintegracao_titulo.DFdata_limite_desconto,'ddMMyyyy',''),103) 
			END AS TituloDataDesconto, 
		   FORMAT(TBintegracao_titulo.DFvalor_desconto, 'n', 'pt-br') AS TituloValorDescontoTaxa, 
		   FORMAT(TBintegracao_titulo.DFvalor_desconto, 'n', 'pt-br') AS TituloValorDesconto, 
		   CASE TBintegracao_titulo.DFcod_banco 
				WHEN 033 THEN CASE WHEN DFinformar_mora_santander = 0 THEN NULL ELSE TBintegracao_titulo.DFinformar_mora_santander END
				WHEN 756 THEN CASE WHEN DFinformar_mora_sicoob = 0 THEN NULL ELSE TBintegracao_titulo.DFinformar_mora_sicoob END
				ELSE CASE WHEN DFinformar_mora = 0 THEN NULL ELSE TBintegracao_titulo.DFinformar_mora END
			END AS TituloCodigoJuros, 
		   CASE WHEN TBintegracao_titulo.DFdata_mora_diaria = '00000000'
				THEN ''
				ELSE CONVERT(NVARCHAR,dbo.FORMATAR_DATA(TBintegracao_titulo.DFdata_mora_diaria,'ddMMyyyy',''),103) 
			END AS TituloDataJuros, 
		   FORMAT(TBintegracao_titulo.DFvalor_mora_diaria, 'n', 'pt-br') AS TituloValorJuros, 
		   CASE TBintegracao_titulo.DFcod_banco 
				WHEN 033 THEN TBintegracao_titulo.DFinformar_multa_santander 
				WHEN 237 THEN TBintegracao_titulo.DFinformar_multa_bradesco
				WHEN 422 THEN TBintegracao_titulo.DFinformar_multa_safra
				WHEN 748 THEN TBintegracao_titulo.DFinformar_multa_sicredi
				WHEN 756 THEN TBintegracao_titulo.DFinformar_multa_sicoob
				ELSE TBintegracao_titulo.DFinformar_multa
			END AS TituloCodigoMulta, 
		   CASE WHEN TBintegracao_titulo.DFdata_multa_apos = '00000000'
				THEN ''
				ELSE CONVERT(NVARCHAR,dbo.FORMATAR_DATA(TBintegracao_titulo.DFdata_multa_apos,'ddMMyyyy',''),103) 
			END AS TituloDataMulta, 
		   FORMAT(TBintegracao_titulo.DFvalor_multa_por_atraso, 'n', 'pt-br') AS TituloValorMultaTaxa, 
		   TBintegracao_titulo.DFcodigo_protesto AS TituloCodProtesto, 
		   CASE WHEN DFcodigo_protesto = 0 THEN NULL ELSE TBintegracao_titulo.DFdias_protesto END AS TituloPrazoProtesto, 
		   TBintegracao_titulo.DFcodigo_devolucao AS TituloCodBaixaDevolucao, 
		   CASE WHEN DFcodigo_devolucao = 0 THEN NULL ELSE TBintegracao_titulo.DFdias_devolucao END AS TituloPrazoBaixa, 
		   CAST(NULL AS NVARCHAR(80)) AS TituloMensagem01, 
		   CAST(NULL AS NVARCHAR(80)) AS TituloMensagem02, 
		   CAST(NULL AS NVARCHAR(80)) AS TituloMensagem03, 
		   CAST(NULL AS NVARCHAR(80)) AS TituloMensagem04, 
		   CAST(NULL AS NVARCHAR(80)) AS TituloMensagem05, 
		   CAST(NULL AS NVARCHAR(80)) AS TituloMensagem06, 
		   CAST(NULL AS NVARCHAR(80)) AS TituloMensagem07, 
		   CAST(NULL AS NVARCHAR(80)) AS TituloMensagem08, 
		   CAST(NULL AS NVARCHAR(80)) AS TituloMensagem09, 
		   TBintegracao_titulo.DFsacador_avalista AS TituloSacadorAvalista, 
		   (TBintegracao_titulo.DFend_sacador_avalista + ' ' + TBintegracao_titulo.DFbairro_sacador_avalista) AS TituloSacadorAvalistaEndereco, 
		   TBintegracao_titulo.DFcidade_sacador_avalista AS TituloSacadorAvalistaCidade, 
		   CAST(dbo.FORMATA_VALOR(TBintegracao_titulo.DFcep_sacador_avalista,8,0,1,'S') AS NVARCHAR(10)) AS TituloSacadorAvalistaCEP, 
		   TBintegracao_titulo.DFuf_sacador_avalista AS TituloSacadorAvalistaUF, 
		   TBintegracao_titulo.DFcnpj_sacador_avalista AS TituloInscricaoSacadorAvalista, 
		   'B' AS TituloEmissaoBoleto, 
		   '2' AS TituloCategoria, 
		   'N' AS TituloPostagemBoleto, 
		   '2' AS TituloCodEmissaoBloqueto, 
		   '2' AS TituloCodDistribuicaoBloqueto, 
		   FORMAT(TBintegracao_titulo.DFvalor_encargo, 'n', 'pt-br') AS TituloOutrosAcrescimos, 
		   FORMAT(TBintegracao_titulo.DFvalor_abatimento, 'n', 'pt-br') AS TituloValorAbatimento, 
		   '' AS TituloInformacoesAdicionais, 
		   '(Todas as informações deste bloqueto são de exclusiva responsabilidade do ' + case when ISNULL(DFsacador_avalista,'') = '' then 'Beneficiário)' else 'Sacador Avalista)' end AS TituloInstrucoes, 
		   CASE WHEN ISNUMERIC(TBintegracao_titulo.DFcomplemento) = 1 THEN dbo.FORMATA_VALOR(TBintegracao_titulo.DFcomplemento,2,0,1,'S') ELSE '' END AS TituloParcela, 
		   TBintegracao_titulo.DFvariacao AS TituloVariacaoCarteira,  
		   TBtitulo_cobranca_bancaria.DFid_titulo_receber TituloCodigoReferencia, 
		   NULL AS TituloTipoCobranca, 
		   CONVERT(NVARCHAR,dbo.FORMATAR_DATA(TBintegracao_titulo.DFdata_limite_pagto,'ddMMyyyy',''),103) AS TituloDataLimite, 
		   NULL AS TituloCodigoSacadorAvalista,			--somente SICREDI
		   TBintegracao_titulo.DFnumero_nf AS TituloNumeroNfe, 
		   TBintegracao_titulo.DFvalor_nf AS TituloValorNfe, 
		   TBintegracao_titulo.DFdt_emissao_nf AS TituloDataEmissaoNfe, 
		   TBintegracao_titulo.DFchave_nfe AS TituloChaveDanfe, 
		   NULL AS TituloCip, 
		   NULL AS TituloInstrucao1, 
		   NULL AS TituloInstrucao2, 
		   NULL AS TituloInstrucao3, 
		   NULL AS TituloInstrucaoPrazo1, 
		   NULL AS TituloInstrucaoPrazo2, 
		   NULL AS TituloInstrucaoPrazo3, 
		   NULL AS TituloDescontavel,					--somente UNICRED
		   NULL AS CedenteContaCodigoEmpresa,			--somente DAYCOVAL e BRADESCO
		   NULL AS TituloAgenciaCobradora,				--somente BANESTES
		   NULL AS TituloClassificacao,					--somente ABC
		   NULL AS TituloTipoDocumento,					--somente ABC
		   NULL AS TituloAnoProcessamento,				--somente SICREDI
		   NULL AS TituloIdentificacaoTipoPagamento,	--somente BRB, CAIXA e SANTANDER
		   NULL AS TituloMinimoValorTaxa,		
		   NULL AS TituloMaximoValorTaxa, 
		   NULL AS TituloCodigoServico,					--somente BS2
		   NULL AS TituloModalidade, 
		   NULL AS TituloRegistroInformativo,			--somente SICREDI [array de mensagens]
		   NULL AS TituloTipoFormulario,				--somente SICOOB
		   NULL AS TituloTipoImpressaoMensagem,			--somente SICOOB ["1"- Frente do bloqueto | "2"- Verso do bloqueto | "3"- Corpo de instrução]
		   NULL AS TituloOrgaoNegativador,				--somente BBRASIL
		   NULL AS TituloCaucionavel					--somente UNICRED
	  
	  INTO #TBtemp_titulos
	  FROM TBintegracao_cobranca_bancaria AS TBintegracao WITH (NOLOCK)
	 INNER JOIN TBintegracao_cobranca_bancaria_titulo_receber AS TBintegracao_titulo WITH (NOLOCK)
		ON TBintegracao.DFid_titulo_receber_envio_cobranca_bancaria = TBintegracao_titulo.DFid_titulo_receber_envio_cobranca_bancaria 
	 INNER JOIN TBtitulo_receber_envio_cobranca_bancaria AS TBtitulo_cobranca_bancaria WITH (NOLOCK)
		ON TBintegracao.DFid_titulo_receber_envio_cobranca_bancaria = TBtitulo_cobranca_bancaria.DFid_titulo_receber_envio_cobranca_bancaria 
	 INNER JOIN VWtecnospeed_cadastros WITH (NOLOCK)
		ON TBtitulo_cobranca_bancaria.DFcod_configuracao_carteira_cobranca = VWtecnospeed_cadastros.DFcod_configuracao_carteira_cobranca
	  LEFT JOIN (SELECT TBbanco_instrucao_cobranca.DFcod_banco, TBinstrucao_cobranca.DFdescricao 
				   FROM TBinstrucao_cobranca WITH (NOLOCK) 
				  INNER JOIN TBbanco_instrucao_cobranca WITH (NOLOCK) 
					 ON TBbanco_instrucao_cobranca.DFcod_instrucao_cobranca = TBinstrucao_cobranca.DFcod_instrucao_cobranca 
				  WHERE TBinstrucao_cobranca.DFtipo_instrucao = 'L') AS TBinstrucao_local_pagamento
		ON TBintegracao_titulo.DFcod_banco = TBinstrucao_local_pagamento.DFcod_banco 
	 
	 WHERE TBintegracao.DFstatus = 1
	   AND TBintegracao.DFcod_empresa = @COD_EMPRESA 

	-- BUSCAR MENSAGENS
	DECLARE @ID_TITULO_RECEBER INT, @COD_BANCO INT, @TB_MENSAGENS NVARCHAR(100), @SQL NVARCHAR(MAX)

	DECLARE cCursor CURSOR STATIC FORWARD_ONLY READ_ONLY FOR  
		SELECT TituloCodigoReferencia AS DFid_titulo_receber
			 , CedenteContaCodigoBanco AS DFcod_banco 
		  FROM #TBtemp_titulos WITH (NOLOCK) 
	OPEN cCursor
	FETCH NEXT FROM cCursor INTO @ID_TITULO_RECEBER, @COD_BANCO
    
	WHILE @@FETCH_STATUS = 0 BEGIN
		SET @TB_MENSAGENS = '##TBtemp_mensagens_boleto_tecnospeed_' + CAST(@@SPID AS NVARCHAR) + '_' + CAST(@ID_TITULO_RECEBER AS NVARCHAR)

		EXEC sp_cr_Buscar_msg_instrucoes_boleto @ID_TITULO_RECEBER, @COD_BANCO, @TB_MENSAGENS 

		SET @SQL = '
			UPDATE #TBtemp_titulos
			   SET TituloMensagem01 = TBmensagens.DFmensagem_1, 
				   TituloMensagem02 = TBmensagens.DFmensagem_2, 
				   TituloMensagem03 = TBmensagens.DFmensagem_3, 
				   TituloMensagem04 = TBmensagens.DFmensagem_4, 
				   TituloMensagem05 = TBmensagens.DFmensagem_5,
				   TituloMensagem06 = TBmensagens.DFmensagem_6,
				   TituloMensagem07 = TBmensagens.DFmensagem_7,
				   TituloMensagem08 = TBmensagens.DFmensagem_8,
				   TituloMensagem09 = TBmensagens.DFmensagem_9
			  FROM #TBtemp_titulos AS TBtemp
			 INNER JOIN ' + @TB_MENSAGENS + ' AS TBmensagens 
			    ON TBtemp.TituloCodigoReferencia = TBmensagens.DFid_titulo_receber'
		EXEC( @SQL )

		FETCH NEXT FROM cCursor INTO @ID_TITULO_RECEBER, @COD_BANCO
	END
	CLOSE cCursor
	DEALLOCATE cCursor

	-- Atualiza Status para 2 (Enviado) --------------------------------------------------------------------------
	UPDATE TBintegracao_cobranca_bancaria
	   SET DFstatus = 2
		 , DFdata_envio = (CONVERT(SMALLDATETIME, GETDATE(), 112))
		 , DFsequencia = (ISNULL(TBsequencia.DFsequencia, 0) + 1)
	  FROM TBintegracao_cobranca_bancaria
	 CROSS JOIN (SELECT MAX(DFsequencia) AS DFsequencia
				   FROM TBintegracao_cobranca_bancaria 
				  WHERE CAST(DFdata_envio AS DATE) = CAST(GETDATE() AS DATE)) AS TBsequencia
	 INNER JOIN TBtitulo_receber_envio_cobranca_bancaria
		ON TBintegracao_cobranca_bancaria.DFid_titulo_receber_envio_cobranca_bancaria = TBtitulo_receber_envio_cobranca_bancaria.DFid_titulo_receber_envio_cobranca_bancaria
	 INNER JOIN (SELECT TituloCodigoReferencia AS DFid_titulo_receber FROM #TBtemp_titulos) AS TBtemp
		ON TBtitulo_receber_envio_cobranca_bancaria.DFid_titulo_receber = TBtemp.DFid_titulo_receber
	--------------------------------------------------------------------------------------------------------------

	COMMIT TRANSACTION

	-- Gera XML
	SET @XML = (SELECT * FROM #TBtemp_titulos AS TBtemp
				   FOR XML PATH ('Boleto'), ROOT ('Boletos'), TYPE)
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

	IF CURSOR_STATUS( 'variable', 'cCursor' ) <> -1 BEGIN
		CLOSE cCursor
		DEALLOCATE cCursor
	END

	DECLARE @ErrorMessage NVARCHAR(4000)

    SELECT @ErrorMessage = ERROR_MESSAGE()

	IF @TRANCOUNT <> @@TRANCOUNT BEGIN
		ROLLBACK TRANSACTION Inclusao_Boleto
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
EXEC sp_cr_TecnoSpeed_Envio_Boleto 2
*/
	 