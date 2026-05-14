IF dbo.OBJECT_ID('sp_cr_TecnoSpeed_Conta_Retorno') IS NOT NULL DROP PROCEDURE sp_cr_TecnoSpeed_Conta_Retorno
GO

CREATE PROCEDURE sp_cr_TecnoSpeed_Conta_Retorno( @XML XML )
WITH ENCRYPTION 
AS
BEGIN TRY 
    SET NOCOUNT ON

	DECLARE @STATUS NVARCHAR(10), 
			@MSG_ERRO NVARCHAR(MAX)

	IF dbo.OBJECT_ID( 'tempdb..#TBtemp_conta' ) IS NOT NULL DROP TABLE #TBtemp_conta

	SELECT ref.value('(*[lower-case(local-name())="_status"])[1]', 'nvarchar(10)') AS DFstatus
	     , ref.value('(*[lower-case(local-name())="_mensagem"])[1]', 'nvarchar(max)') AS DFmensagem
		 , ref.value('(./_dados/*[lower-case(local-name())="id"])[1]', 'bigint') AS DFid_conta_tecno
		 , ref.value('(./_dados/*[lower-case(local-name())="codigo_banco"])[1]', 'int') AS DFcodigo_banco
		 , ref.value('(./_dados/*[lower-case(local-name())="agencia"])[1]', 'int') AS DFagencia
		 , ref.value('(./_dados/*[lower-case(local-name())="agencia_dv"])[1]', 'nvarchar(1)') AS DFagencia_dv
		 , ref.value('(./_dados/*[lower-case(local-name())="conta"])[1]', 'bigint') AS DFconta
		 , ref.value('(./_dados/*[lower-case(local-name())="conta_dv"])[1]', 'nvarchar(1)') AS DFconta_dv
		 , ref.value('(./_dados/*[lower-case(local-name())="tipo_conta"])[1]', 'nvarchar(10)') AS DFtipo_conta
		 , ref.value('(./_dados/*[lower-case(local-name())="cod_beneficiario"])[1]', 'nvarchar(20)') AS DFcod_beneficiario
		 , ref.value('(./_dados/*[lower-case(local-name())="id_cedente"])[1]', 'bigint') AS DFid_cedente_tecno
		 , ref.value('(./_dados/*[lower-case(local-name())="_campo"])[1]', 'nvarchar(50)') AS DFcampo
		 , ref.value('(./_dados/*[lower-case(local-name())="_erro"])[1]', 'nvarchar(max)') AS DFerro
	  INTO #TBtemp_conta
	  FROM @XML.nodes('//Parametros') XML( ref )

	SELECT TOP 1
		   @STATUS = UPPER(DFstatus), 
		   @MSG_ERRO = 'Mensagem: ' + DFmensagem + char(13) + 'Campo: ' + DFcampo + char(13) + 'Erro: ' + DFerro
	  FROM #TBtemp_conta

	IF @STATUS = 'SUCESSO' BEGIN
		INSERT INTO TBconta_tecnospeed( DFid_cedente_tecnospeed, DFid_conta, DFcod_conta_tecno )
		SELECT TBcedente.DFid_cedente_tecnospeed, TBconta.DFid_conta, TBtemp.DFid_conta_tecno
		  FROM #TBtemp_conta AS TBtemp
		 INNER JOIN (SELECT DFid_conta, TBagencia.DFcod_banco
						  , TBagencia.DFnumero AS DFnum_agencia
						  , TBconta.DFnumero AS DFnum_conta
						  , TBconta.DFdigito_verificador AS DFdig_conta
					   FROM TBconta WITH (NOLOCK)
					  INNER JOIN TBagencia WITH (NOLOCK)
						 ON TBconta.DFid_agencia = TBagencia.DFid_agencia) AS TBconta
			ON TBtemp.DFcodigo_banco = TBconta.DFcod_banco 
		   AND TBtemp.DFagencia = TBconta.DFnum_agencia 
		   AND TBtemp.DFconta = TBconta.DFnum_conta 
		   AND TBtemp.DFconta_dv = TBconta.DFdig_conta 
		 INNER JOIN TBcedente_tecnospeed AS TBcedente WITH (NOLOCK)
			ON TBtemp.DFid_cedente_tecno = TBcedente.DFcod_cedente_tecno 
		 WHERE TBconta.DFid_conta NOT IN (SELECT DFid_conta FROM TBconta_tecnospeed)
	END

	IF @STATUS = 'ERRO' BEGIN
		RAISERROR( @MSG_ERRO, 16, 1 )
	END

    SET NOCOUNT OFF
END TRY

BEGIN CATCH

	DECLARE @ErrorNumber INT,
			@ErrorMessage NVARCHAR(4000),
			@ErrorSeverity INT,
			@ErrorState INT

    SELECT @ErrorNumber = ERROR_NUMBER(),
		   @ErrorMessage = ERROR_MESSAGE() + CHAR(13) + '%s %d.',
           @ErrorSeverity = ERROR_SEVERITY(),
           @ErrorState = ERROR_STATE()

    RAISERROR( @ErrorMessage, @ErrorSeverity, @ErrorState, N'Erro original:', @ErrorNumber )

    SET NOCOUNT OFF

END CATCH
GO
/*
EXEC sp_cr_TecnoSpeed_Conta_Retorno 
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

SELECT * FROM TBconta_tecnospeed
*/