IF dbo.OBJECT_ID('sp_cp_TecnoSpeed_Conta_Pagamento_Retorno') IS NOT NULL DROP PROCEDURE sp_cp_TecnoSpeed_Conta_Pagamento_Retorno
GO

CREATE PROCEDURE sp_cp_TecnoSpeed_Conta_Pagamento_Retorno( @XML XML )
WITH ENCRYPTION 
AS
BEGIN TRY 
    SET NOCOUNT ON

	DECLARE @COD_ERRO INT, 
			@MSG_ERRO NVARCHAR(MAX)

	IF dbo.OBJECT_ID( 'tempdb..#TBtemp_conta' ) IS NOT NULL DROP TABLE #TBtemp_conta
	IF dbo.OBJECT_ID( 'tempdb..#TBtemp_erros' ) IS NOT NULL DROP TABLE #TBtemp_erros

	SELECT ref.value('(*[lower-case(local-name())="bankcode"])[1]', 'smallint') AS DFcodigo_banco
		 , ref.value('(*[lower-case(local-name())="agency"])[1]', 'nvarchar(10)') AS DFagencia
		 , ref.value('(*[lower-case(local-name())="agencydigit"])[1]', 'nvarchar(5)') AS DFagencia_dv
		 , ref.value('(*[lower-case(local-name())="accountnumber"])[1]', 'nvarchar(20)') AS DFconta
		 , ref.value('(*[lower-case(local-name())="accountnumberdigit"])[1]', 'nvarchar(5)') AS DFconta_dv
		 , ref.value('(*[lower-case(local-name())="accounthash"])[1]', 'nvarchar(20)') AS DFid_conta_pagto_tecno
	  INTO #TBtemp_conta
	  FROM @XML.nodes('//Parametros/accounts') XML( ref )

	SELECT ref.value('(/Parametros/code)[1]', 'int') AS DFcodigo
		 , ref.value('(/Parametros/message)[1]', 'varchar(100)') AS DFmensagem
		 , ref.value('(*[lower-case(local-name())="message"])[1]', 'nvarchar(100)') AS DFmsg_erro
		 , ref.value('(*[lower-case(local-name())="internalcode"])[1]', 'nvarchar(10)') AS DFcod_erro
	  INTO #TBtemp_erros
	  FROM @XML.nodes('//Parametros/errors') XML( ref )

	SELECT TOP 1
		   @COD_ERRO = UPPER(DFcodigo), 
		   @MSG_ERRO = 'Mensagem: ' + DFmensagem + char(13) + 'Erro: ' + DFmsg_erro + char(13) + 'Código: ' + DFcod_erro
	  FROM #TBtemp_erros

	IF ISNULL(@COD_ERRO,0) = 0 BEGIN
		INSERT INTO TBconta_pagamento_tecnospeed( DFid_pagador_tecnospeed, DFid_conta, DFcod_conta_pagto_tecno )
		SELECT TBpagador.DFid_pagador_tecnospeed, TBconta.DFid_conta, TBtemp.DFid_conta_pagto_tecno
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
		 INNER JOIN TBconta_correntista WITH (NOLOCK)
			ON TBconta.DFid_conta = TBconta_correntista.DFid_conta
		 INNER JOIN TBempresa WITH (NOLOCK)
			ON TBconta_correntista.DFid_correntista = TBempresa.DFid_correntista
		 INNER JOIN TBpagador_tecnospeed AS TBpagador WITH (NOLOCK)
			ON TBpagador.DFcod_empresa = TBempresa.DFcod_empresa 
		 WHERE TBconta.DFid_conta NOT IN (SELECT DFid_conta FROM TBconta_pagamento_tecnospeed) 
						   
	END

	IF ISNULL(@COD_ERRO,0) > 0 BEGIN
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
