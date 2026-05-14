IF dbo.OBJECT_ID('sp_cp_TecnoSpeed_Pagador_Retorno') IS NOT NULL DROP PROCEDURE sp_cp_TecnoSpeed_Pagador_Retorno
GO

CREATE PROCEDURE sp_cp_TecnoSpeed_Pagador_Retorno( @XML XML )
WITH ENCRYPTION 
AS
BEGIN TRY 
    SET NOCOUNT ON

	DECLARE @COD_ERRO INT, 
			@MSG_ERRO NVARCHAR(MAX)

	IF dbo.OBJECT_ID( 'tempdb..#TBtemp_pagador' ) IS NOT NULL DROP TABLE #TBtemp_pagador
	IF dbo.OBJECT_ID( 'tempdb..#TBtemp_erros' ) IS NOT NULL DROP TABLE #TBtemp_erros

	SELECT ref.value('(*[lower-case(local-name())="status"])[1]', 'smallint') AS DFstatus
		 , ref.value('(*[lower-case(local-name())="cpfcnpj"])[1]', 'nvarchar(20)') AS DFcpf_cnpj
		 , ref.value('(*[lower-case(local-name())="token"])[1]', 'nvarchar(50)') AS DFtoken_pagador
	  INTO #TBtemp_pagador
	  FROM @XML.nodes('//Parametros') XML( ref )

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
		INSERT INTO TBpagador_tecnospeed( DFcod_empresa, DFtoken_pagador )
		SELECT TBempresa.DFcod_empresa, ISNULL(TBtemp.DFtoken_pagador,'') AS DFtoken
		  FROM #TBtemp_pagador AS TBtemp
		 INNER JOIN TBempresa WITH (NOLOCK)
			ON TBtemp.DFcpf_cnpj = TBempresa.DFcgc_cei_cpf 
		 WHERE TBempresa.DFcod_empresa NOT IN (SELECT DFcod_empresa FROM TBcedente_tecnospeed)
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
