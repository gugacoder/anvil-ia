IF dbo.OBJECT_ID('sp_cr_TecnoSpeed_Convenio_Retorno') IS NOT NULL DROP PROCEDURE sp_cr_TecnoSpeed_Convenio_Retorno
GO

CREATE PROCEDURE sp_cr_TecnoSpeed_Convenio_Retorno( @XML XML )
WITH ENCRYPTION 
AS
BEGIN TRY 
    SET NOCOUNT ON

	DECLARE @STATUS NVARCHAR(10), 
			@ID_LOG INT = 0,
			@DATA_LOG DATETIME, 
			@MSG_ERRO NVARCHAR(MAX)

	-- GRAVA LOG ----------------------------------------------------------------------
	SET @DATA_LOG = (CONVERT( DATETIME, CONVERT( NVARCHAR, GETDATE(), 120 )))

	INSERT INTO TBintegracao_cobranca_bancaria_log( DFdata_log, DFxml, DFrotina )
		 SELECT @DATA_LOG, @XML, 'sp_cr_TecnoSpeed_Convenio_Retorno'

	IF @@ROWCOUNT <> 0 BEGIN
		SET @ID_LOG = ( SCOPE_IDENTITY() )
	END

	IF @ID_LOG = 0 BEGIN
		SET @MSG_ERRO = 'Erro ao gravar log de Retorno do Cadastro de Convênio'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END
	-----------------------------------------------------------------------------------

	DECLARE @TRANCOUNT SMALLINT
	SET @TRANCOUNT = @@TRANCOUNT

	IF dbo.OBJECT_ID( 'tempdb..#TBtemp_convenio' ) IS NOT NULL DROP TABLE #TBtemp_convenio

	SELECT ref.value('(*[lower-case(local-name())="_status"])[1]', 'nvarchar(10)') AS DFstatus
	     , ref.value('(*[lower-case(local-name())="_mensagem"])[1]', 'nvarchar(max)') AS DFmensagem
		 , ref.value('(./_dados/*[lower-case(local-name())="id"])[1]', 'bigint') AS DFid_convenio_tecno
		 , ref.value('(./_dados/*[lower-case(local-name())="numero_convenio"])[1]', 'nvarchar(20)') AS DFnumero_convenio
		 , ref.value('(./_dados/*[lower-case(local-name())="descricao_convenio"])[1]', 'nvarchar(100)') AS DFdescricao_convenio
		 , ref.value('(./_dados/*[lower-case(local-name())="carteira"])[1]', 'int') AS DFnumero_carteira
		 , ref.value('(./_dados/*[lower-case(local-name())="especie"])[1]', 'nvarchar(10)') AS DFespecie
		 , ref.value('(./_dados/*[lower-case(local-name())="id_conta"])[1]', 'bigint') AS DFid_conta_tecno
		 , ref.value('(./_dados/*[lower-case(local-name())="padraocnab"])[1]', 'nvarchar(10)') AS DFpadraoCNAB
		 , ref.value('(./_dados/*[lower-case(local-name())="utiliza_van"])[1]', 'bit') AS DFutiliza_van
		 , ref.value('(./_dados/*[lower-case(local-name())="numero_remessa"])[1]', 'int') AS DFnumero_remessa
		 , ref.value('(./_dados/*[lower-case(local-name())="_campo"])[1]', 'nvarchar(50)') AS DFcampo
		 , ref.value('(./_dados/*[lower-case(local-name())="_erro"])[1]', 'nvarchar(max)') AS DFerro
	  INTO #TBtemp_convenio
	  FROM @XML.nodes('//Parametros') XML( ref )

	SELECT TOP 1
		   @STATUS = UPPER(DFstatus), 
		   @MSG_ERRO = 'Mensagem: ' + DFmensagem + char(13) + 'Campo: ' + ISNULL(DFcampo,'') + char(13) + 'Erro: ' + ISNULL(DFerro,'')
	  FROM #TBtemp_convenio

	BEGIN TRANSACTION
	SAVE TRANSACTION Cadastro_Convenio
	
	IF @STATUS = 'SUCESSO' BEGIN
		INSERT INTO TBconvenio_tecnospeed( DFid_conta_tecnospeed, DFcod_configuracao_carteira, DFcod_convenio_tecno )
		SELECT TBconta_tecno.DFid_conta_tecnospeed, TBconvenio.DFcod_configuracao_carteira_cobranca ,TBtemp.DFid_convenio_tecno 
		  FROM #TBtemp_convenio AS TBtemp
		 INNER JOIN TBconta_tecnospeed AS TBconta_tecno WITH (NOLOCK)
			ON TBtemp.DFid_conta_tecno = TBconta_tecno.DFcod_conta_tecno
		 INNER JOIN VWtecnospeed_cadastros AS TBconvenio WITH (NOLOCK)
			ON TBtemp.DFnumero_convenio = TBconvenio.DFnumero_convenio 
		   AND TBtemp.DFnumero_carteira = TBconvenio.DFnum_carteira
		   AND TBconta_tecno.DFid_conta = TBconvenio.DFid_conta 
		 WHERE TBconvenio.DFcod_configuracao_carteira_cobranca NOT IN (SELECT DFcod_configuracao_carteira_cobranca FROM TBconvenio_tecnospeed)
	END

	COMMIT TRANSACTION

	IF @STATUS = 'ERRO' BEGIN
		RAISERROR( @MSG_ERRO, 16, 1 )
	END

    SET NOCOUNT OFF
END TRY

BEGIN CATCH
	DECLARE @ErrorMessage NVARCHAR(4000)

    SELECT @ErrorMessage = ERROR_MESSAGE()

	IF @TRANCOUNT <> @@TRANCOUNT BEGIN
		ROLLBACK TRANSACTION Cadastro_Convenio
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
EXEC sp_cr_TecnoSpeed_Convenio_Retorno 
'<root>
     <_status>sucesso</_status>
     <_dados>
         <id>168</id>
         <codigo_banco>033</codigo_banco>
         <agencia>0179</agencia>
         <agencia_dv>1</agencia_dv>
         <conta>13010345</conta>
         <conta_dv>0</conta_dv>
         <tipo_conta>CORRENTE</tipo_conta>
         <cod_beneficiario>60473</cod_beneficiario>
         <id_cedente>728</id_cedente>
         <criado>2017-03-30T16:53:48.000Z</criado>
         <atualizado>2017-03-30T16:53:48.000Z</atualizado>
         <cod_empresa></cod_empresa>
     </_dados>
 </root>'

SELECT * FROM TBconvenio_tecnospeed
*/