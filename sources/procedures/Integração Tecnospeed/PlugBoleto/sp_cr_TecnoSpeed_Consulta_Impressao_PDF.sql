IF dbo.OBJECT_ID('sp_cr_TecnoSpeed_Consulta_Impressao_PDF') IS NOT NULL DROP PROCEDURE sp_cr_TecnoSpeed_Consulta_Impressao_PDF
GO

CREATE PROCEDURE sp_cr_TecnoSpeed_Consulta_Impressao_PDF( @PROTOCOLO NVARCHAR(20), @XML XML )
WITH ENCRYPTION 
AS
BEGIN TRY 
    SET NOCOUNT ON

	DECLARE	@ID_LOG INT = 0,
			@DATA_LOG DATETIME,
			@MSG_ERRO NVARCHAR(4000)

	-- GRAVA LOG ------------------------------------------------------------------------------------------------
	SET @DATA_LOG = (CONVERT( DATETIME, CONVERT( NVARCHAR, GETDATE(), 120 )))

	INSERT INTO TBintegracao_cobranca_bancaria_log( DFdata_log, DFxml, DFrotina )
		 SELECT @DATA_LOG, @XML, 'sp_cr_TecnoSpeed_Consulta_Impressao_PDF'

	IF @@ROWCOUNT <> 0 BEGIN
		SET @ID_LOG = ( SCOPE_IDENTITY() )
	END

	IF @ID_LOG = 0 BEGIN
		SET @MSG_ERRO = 'Erro ao gravar log de Integração Cobrança Bancaria'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END
	-------------------------------------------------------------------------------------------------------------

	-- Busca Cod Cliente ----------------------------------------------------------------------------------------
	DECLARE @ID_TITULO_RECEBER INT, @COD_CLIENTE NVARCHAR(20), @NUM_TITULO NVARCHAR(20)

	SELECT DISTINCT 
		   @COD_CLIENTE = TBtitulo_receber.DFcod_cliente
		 , @NUM_TITULO = TBtitulo_receber.DFnumero_titulo + CASE WHEN TBtitulo_receber.DFcomplemento = '' THEN '' ELSE '-' + TBtitulo_receber.DFcomplemento END 
	  FROM TBintegracao_cobranca_bancaria WITH (NOLOCK)
	 INNER JOIN TBtitulo_receber_envio_cobranca_bancaria WITH (NOLOCK)
		ON TBintegracao_cobranca_bancaria.DFid_titulo_receber_envio_cobranca_bancaria = TBtitulo_receber_envio_cobranca_bancaria.DFid_titulo_receber_envio_cobranca_bancaria
	 INNER JOIN TBtitulo_receber WITH (NOLOCK)
		ON TBtitulo_receber_envio_cobranca_bancaria.DFid_titulo_receber = TBtitulo_receber.DFid_titulo_receber
	 WHERE TBintegracao_cobranca_bancaria.DFprotocolo = @PROTOCOLO
	-------------------------------------------------------------------------------------------------------------

	DECLARE @PDF_BASE64 NVARCHAR(MAX),
			@PDF VARBINARY(MAX)

	SELECT @PDF_BASE64 = ref.value('(*[lower-case(local-name())="arquivo"])[1]', 'nvarchar(max)') 
	  FROM @XML.nodes('//Parametros') XML( ref )	
	
	IF ISNULL(@PDF_BASE64, '') = '' BEGIN
		SET @MSG_ERRO = 'Boleto PDF não retornado ou inválido.'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END

    SET @PDF = CAST(CAST('' AS XML).value('xs:base64Binary(sql:variable("@PDF_BASE64"))', 'VARBINARY(MAX)') AS VARBINARY(MAX));

	-- Gravando PDF ---------------------------------------------------------------------------------------------
	DECLARE @Path NVARCHAR(1024);
	DECLARE @Filename NVARCHAR(1024);
	DECLARE @FullPathToOutputFile NVARCHAR(MAX);
	DECLARE @ObjectToken INT

	SELECT @Path = dbo.VALIDAR_OPCAO(4815,1,'');
	SELECT @Filename = 'Boleto_Cliente_' + @COD_CLIENTE + '_' + @NUM_TITULO + '_' + CONVERT(NVARCHAR, GETDATE(), 112) + '_' + REPLACE(CONVERT(NVARCHAR, GETDATE(), 108),':','') + '.pdf';
	SELECT @FullPathToOutputFile = @Path + CASE WHEN RIGHT(@Path,1) = '\' THEN '' ELSE '\' END + @Filename;

	EXEC sp_OACreate 'ADODB.Stream', @ObjectToken OUTPUT;
	EXEC sp_OASetProperty @ObjectToken, 'Type', 1;
	EXEC sp_OAMethod @ObjectToken, 'Open';
	EXEC sp_OAMethod @ObjectToken, 'Write', NULL, @PDF;
	EXEC sp_OAMethod @ObjectToken, 'SaveToFile', NULL, @FullPathToOutputFile, 2;
	EXEC sp_OAMethod @ObjectToken, 'Close';
	EXEC sp_OADestroy @ObjectToken;

	-- Valida se arquivo foi gravado e atualiza status ----------------------------------------------------------
	DECLARE @COMANDO VARCHAR(8000), @RETORNO SMALLINT

	SET @COMANDO = 'DIR "' + @FullPathToOutputFile + '" /B';
	EXEC @RETORNO = xp_cmdshell @COMANDO, NO_OUTPUT

	IF @RETORNO = 0	-- SUCESSO
		UPDATE TBintegracao_cobranca_bancaria
		   SET DFarquivo_boleto = @Filename
		  FROM TBintegracao_cobranca_bancaria
		 WHERE DFprotocolo = @PROTOCOLO
	ELSE BEGIN
		SET @MSG_ERRO = 'Não foi possível gravar o boleto "' + @NUM_TITULO + '" do cliente "' + @COD_CLIENTE + '".'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END

    SET NOCOUNT OFF
END TRY

BEGIN CATCH
	DECLARE @ErrorMessage NVARCHAR(4000)

    SELECT @ErrorMessage = ERROR_MESSAGE()

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
EXEC sp_cr_TecnoSpeed_Consulta_Impressao_PDF
*/