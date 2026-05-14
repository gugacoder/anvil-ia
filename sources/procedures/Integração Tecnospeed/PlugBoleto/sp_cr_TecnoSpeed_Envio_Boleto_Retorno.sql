IF dbo.OBJECT_ID('sp_cr_TecnoSpeed_Envio_Boleto_Retorno') IS NOT NULL DROP PROCEDURE sp_cr_TecnoSpeed_Envio_Boleto_Retorno
GO

CREATE PROCEDURE sp_cr_TecnoSpeed_Envio_Boleto_Retorno( @XML XML )
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
		 SELECT @DATA_LOG, @XML, 'sp_cr_TecnoSpeed_Envio_Boleto_Retorno'

	IF @@ROWCOUNT <> 0 BEGIN
		SET @ID_LOG = ( SCOPE_IDENTITY() )
	END

	IF @ID_LOG = 0 BEGIN
		SET @MSG_ERRO = 'Erro ao gravar log de Integração Cobrança Bancaria'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END
	-----------------------------------------------------------------------------------

	SET @TRANCOUNT = @@TRANCOUNT
/*
	IF @STATUS <> 'SUCESSO' BEGIN	
		SET @MSG_ERRO = 'Status de Retorno diferente de SUCESSO. (' + @STATUS + ')'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END
*/
	-- Sucesso
	IF dbo.OBJECT_ID( 'tempdb..#TBtemp_boleto_sucesso' ) IS NOT NULL DROP TABLE #TBtemp_boleto_sucesso

	SELECT ref.value('(*[lower-case(local-name())="idintegracao"])[1]', 'nvarchar(20)') AS DFid_integracao
		 , ref.value('(*[lower-case(local-name())="idimpressao"])[1]', 'nvarchar(50)') AS DFid_impressao
		 , ref.value('(*[lower-case(local-name())="situacao"])[1]', 'nvarchar(10)') AS DFsituacao
		 , ref.value('(*[lower-case(local-name())="titulocodigoreferencia"])[1]', 'int') AS DFid_titulo_receber
	  INTO #TBtemp_boleto_sucesso
	  FROM @XML.nodes('//Parametros/_dados/_sucesso') XML( ref )
	----------------------------------------------------------------------------------------------------------------

	-- Falhas
	IF dbo.OBJECT_ID( 'tempdb..#TBtemp_boleto_falha' ) IS NOT NULL DROP TABLE #TBtemp_boleto_falha

	SELECT falha_dados.value('(*[lower-case(local-name())="idintegracao"])[1]', 'nvarchar(20)') AS DFid_integracao,
		   falha_dados.value('(*[lower-case(local-name())="titulocodigoreferencia"])[1]', 'int') AS DFid_titulo_receber,
		   erro_detail.value('local-name(.)', 'nvarchar(255)') AS DFcampo,
		   erro_detail.value('.', 'nvarchar(max)') AS DFerro
	  INTO #TBtemp_boleto_falha
	  FROM @XML.nodes('//Parametros/_dados/_falha') AS falha(falha)
	 OUTER APPLY falha.nodes('./_dados') AS dados(falha_dados)
	 OUTER APPLY falha.nodes('./_erro') AS erro_node(falha_erro)
	 OUTER APPLY falha_erro.nodes('./erros/*') AS erros(erro_detail);
	----------------------------------------------------------------------------------------------------------------

	IF NOT EXISTS(SELECT 1 FROM #TBtemp_boleto_sucesso) AND NOT EXISTS(SELECT 1 FROM #TBtemp_boleto_falha) BEGIN
		SET @MSG_ERRO = 'Nenhum registro foi encontrado no XML!'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END

	BEGIN TRANSACTION
	SAVE TRANSACTION Inclusao_Boleto

	-- Atualiza status de Sucesso
	IF EXISTS(SELECT 1 FROM #TBtemp_boleto_sucesso) BEGIN
		UPDATE TBintegracao_cobranca_bancaria
		   SET DFstatus = 3
		     , DFconsultar = 1
			 , DFid_integracao = TBtemp.DFid_integracao
		     , DFid_impressao = TBtemp.DFid_impressao
		  FROM TBintegracao_cobranca_bancaria
		 INNER JOIN TBtitulo_receber_envio_cobranca_bancaria
			ON TBintegracao_cobranca_bancaria.DFid_titulo_receber_envio_cobranca_bancaria = TBtitulo_receber_envio_cobranca_bancaria.DFid_titulo_receber_envio_cobranca_bancaria
		 INNER JOIN #TBtemp_boleto_sucesso AS TBtemp
			ON TBtitulo_receber_envio_cobranca_bancaria.DFid_titulo_receber = TBtemp.DFid_titulo_receber
		 WHERE DFsituacao = 'SALVO'
	END

	-- Atualiza status de Erro
	IF EXISTS(SELECT 1 FROM #TBtemp_boleto_falha) BEGIN
		UPDATE TBintegracao_cobranca_bancaria
		   SET DFstatus = 9
		     , DFdescricao_erro = TBtemp.DFmsg_erro
			 , DFid_integracao = TBtemp.DFid_integracao
		  FROM TBintegracao_cobranca_bancaria
		 INNER JOIN TBtitulo_receber_envio_cobranca_bancaria
			ON TBintegracao_cobranca_bancaria.DFid_titulo_receber_envio_cobranca_bancaria = TBtitulo_receber_envio_cobranca_bancaria.DFid_titulo_receber_envio_cobranca_bancaria
		 INNER JOIN (SELECT DISTINCT DFid_titulo_receber, DFid_integracao, DFerro AS DFmsg_erro
					   FROM ( SELECT DFid_titulo_receber, DFid_integracao 
								   , ( SELECT ISNULL(( 
									   SELECT CASE WHEN DFerro = '' THEN '' ELSE CAST(DFerro AS NVARCHAR(4000)) + CHAR(10) END AS 'text()' 
										 FROM (SELECT ('(' + TBtemp_group.DFcampo + ' - ' + TBtemp_group.DFerro + ')') AS DFerro 
												 FROM #TBtemp_boleto_falha AS TBtemp_group WITH (NOLOCK) 
												WHERE TBtemp_group.DFid_titulo_receber = TBtemp.DFid_titulo_receber
												GROUP BY TBtemp_group.DFid_titulo_receber, ('(' + TBtemp_group.DFcampo + ' - ' + TBtemp_group.DFerro + ')')
											  ) AS TBtemp 
										  FOR XML PATH('') ), '')) AS DFerro 
							    FROM #TBtemp_boleto_falha AS TBtemp) AS TBtemp) AS TBtemp
			ON TBtitulo_receber_envio_cobranca_bancaria.DFid_titulo_receber = TBtemp.DFid_titulo_receber
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
EXEC sp_cr_TecnoSpeed_Envio_Boleto_Retorno 
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