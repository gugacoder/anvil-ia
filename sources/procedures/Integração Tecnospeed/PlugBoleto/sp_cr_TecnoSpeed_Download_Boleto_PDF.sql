IF dbo.OBJECT_ID('sp_cr_TecnoSpeed_Download_Boleto_PDF') IS NOT NULL DROP PROCEDURE sp_cr_TecnoSpeed_Download_Boleto_PDF
GO

CREATE PROCEDURE sp_cr_TecnoSpeed_Download_Boleto_PDF
WITH ENCRYPTION 
AS
BEGIN TRY 
    SET NOCOUNT ON

	DECLARE @CAMINHO NVARCHAR(MAX),
			@ARQUIVO NVARCHAR(MAX),
			@COMANDO VARCHAR(8000) 

	DECLARE @ID_INTEGRACAO INT = 0, 
			@COD_CLIENTE NVARCHAR(20) = 0, 
			@NUM_TITULO NVARCHAR(20) = '',
			@URL_BOLETO NVARCHAR(4000) = ''

	-- Id e Data para Log ---------------------------------------------------------------------------------------
	DECLARE	@ID_LOG INT = 0,
			@DATA_LOG DATETIME

	SET @DATA_LOG = (CONVERT( DATETIME, CONVERT( NVARCHAR, GETDATE(), 120 )))
	-------------------------------------------------------------------------------------------------------------

	SET @CAMINHO = dbo.VALIDAR_OPCAO(4815,1,'')
	SET @CAMINHO = @CAMINHO + CASE WHEN RIGHT(@CAMINHO,1) = '\' THEN '' ELSE '\' END

	DECLARE cCursor CURSOR STATIC FORWARD_ONLY READ_ONLY FOR  
		SELECT DFid_integracao_cobranca_bancaria, DFcod_cliente, DFurl_boleto, 
			   DFnumero_titulo + CASE WHEN ISNULL(DFcomplemento,'') = '' THEN '' ELSE '-' + DFcomplemento END AS DFnumero_titulo
		  FROM TBintegracao_cobranca_bancaria
		 INNER JOIN TBtitulo_receber_envio_cobranca_bancaria WITH (NOLOCK)
			ON TBintegracao_cobranca_bancaria.DFid_titulo_receber_envio_cobranca_bancaria = TBtitulo_receber_envio_cobranca_bancaria.DFid_titulo_receber_envio_cobranca_bancaria
		 INNER JOIN TBtitulo_receber WITH (NOLOCK)
			ON TBtitulo_receber_envio_cobranca_bancaria.DFid_titulo_receber = TBtitulo_receber.DFid_titulo_receber
		 WHERE DFstatus IN(5)
		   AND DFurl_boleto IS NOT NULL
		 ORDER BY TBtitulo_receber.DFcod_cliente, TBtitulo_receber.DFid_titulo_receber
	OPEN cCursor
	FETCH NEXT FROM cCursor INTO @ID_INTEGRACAO, @COD_CLIENTE, @URL_BOLETO, @NUM_TITULO

	WHILE @@FETCH_STATUS = 0 BEGIN
		DECLARE @RETORNO INT

		SET @ARQUIVO = 'Boleto_Cliente_' + ISNULL(@COD_CLIENTE,0) + '_' + @NUM_TITULO + '_' + CONVERT(NVARCHAR, GETDATE(), 112) + '_' + REPLACE(CONVERT(NVARCHAR, GETDATE(), 108),':','') + '.pdf'
		SET @COMANDO = 'powershell Invoke-WebRequest -Uri "' + @URL_BOLETO + '" -OutFile "' + @CAMINHO + @ARQUIVO + '"'

		EXEC @RETORNO = xp_cmdshell @COMANDO, NO_OUTPUT

		IF @RETORNO = 0		-- SUCESSO
		
			UPDATE TBintegracao_cobranca_bancaria
			   SET DFstatus = 5
			 WHERE DFid_integracao_cobranca_bancaria = @ID_INTEGRACAO
		
		ELSE BEGIN			-- FALHA

			INSERT INTO TBintegracao_cobranca_bancaria_log( DFdata_log, DFxml, DFrotina, DFdescricao_erro )
				 SELECT @DATA_LOG, '', 'sp_cr_TecnoSpeed_Download_Boleto_PDF', 'Erro ao gerar PDF para o título nº "' + @NUM_TITULO + '"'

		END

		FETCH NEXT FROM cCursor INTO  @ID_INTEGRACAO, @COD_CLIENTE, @URL_BOLETO, @NUM_TITULO
	END
	CLOSE cCursor
	DEALLOCATE cCursor

    SET NOCOUNT OFF
END TRY

BEGIN CATCH

	IF CURSOR_STATUS( 'variable', 'cCursor' ) <> -1 BEGIN
		CLOSE cCursor
		DEALLOCATE cCursor
	END

	DECLARE @ErrorMessage NVARCHAR(4000)

    SELECT @ErrorMessage = ERROR_MESSAGE()

	-- GRAVA LOG ----------------------------------------------------------------------
	INSERT INTO TBintegracao_cobranca_bancaria_log( DFdata_log, DFxml, DFrotina, DFdescricao_erro )
		 SELECT @DATA_LOG, '', 'sp_cr_TecnoSpeed_Download_Boleto_PDF', @ErrorMessage
	-----------------------------------------------------------------------------------

    SET NOCOUNT OFF
END CATCH
GO
/*
EXEC sp_cr_TecnoSpeed_Download_Boleto_PDF
*/