IF dbo.OBJECT_ID('sp_cr_TecnoSpeed_Consulta_Impressao_Retorno') IS NOT NULL DROP PROCEDURE sp_cr_TecnoSpeed_Consulta_Impressao_Retorno
GO

CREATE PROCEDURE sp_cr_TecnoSpeed_Consulta_Impressao_Retorno( @ID_INTEGRACAO NVARCHAR(20), @XML XML )
WITH ENCRYPTION 
AS
BEGIN TRY 
    SET NOCOUNT ON

	DECLARE @STATUS NVARCHAR(10), 
			@MSG_ERRO NVARCHAR(4000), 
			@SITUACAO NVARCHAR(100), 
			@PROTOCOLO NVARCHAR(20) 

	DECLARE	@ID_LOG INT = 0,
			@DATA_LOG DATETIME

	-- GRAVA LOG ----------------------------------------------------------------------
	SET @DATA_LOG = (CONVERT( DATETIME, CONVERT( NVARCHAR, GETDATE(), 120 )))

	INSERT INTO TBintegracao_cobranca_bancaria_log( DFdata_log, DFxml, DFrotina )
		 SELECT @DATA_LOG, @XML, 'sp_cr_TecnoSpeed_Consulta_Impressao_Retorno'

	IF @@ROWCOUNT <> 0 BEGIN
		SET @ID_LOG = ( SCOPE_IDENTITY() )
	END

	IF @ID_LOG = 0 BEGIN
		SET @MSG_ERRO = 'Erro ao gravar log de Integração Cobrança Bancaria'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END
	-----------------------------------------------------------------------------------

	IF ISNULL(@ID_INTEGRACAO,'') = '' BEGIN
		SET @MSG_ERRO = 'ID_Integracao inválido. (''' + ISNULL(@ID_INTEGRACAO,'') + ''')'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END

	-- Busca Protocolo ------------------------------------------------------------------------------------------
	SELECT @STATUS = ref.value('(*[lower-case(local-name())="_status"])[1]', 'nvarchar(10)') 
		 , @MSG_ERRO = ref.value('(*[lower-case(local-name())="_mensagem"])[1]', 'nvarchar(4000)') 
		 , @SITUACAO = ref.value('(./_dados/*[lower-case(local-name())="situacao"])[1]', 'nvarchar(100)') 
		 , @PROTOCOLO = ref.value('(./_dados/*[lower-case(local-name())="protocolo"])[1]', 'nvarchar(20)') 
	  FROM @XML.nodes('//Parametros') XML( ref )
	-------------------------------------------------------------------------------------------------------------

	IF ISNULL(@STATUS,'') = '' BEGIN
		SET @MSG_ERRO = 'Status de Retorno inválido. (''' + ISNULL(@STATUS,'') + ''')'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END

	IF @STATUS = 'ERRO' BEGIN	
		SET @MSG_ERRO = @MSG_ERRO 
		RAISERROR( @MSG_ERRO, 16, 1 )
	END

	IF @STATUS = 'SUCESSO' BEGIN	
		UPDATE TBintegracao_cobranca_bancaria
		   SET DFprotocolo = @PROTOCOLO
		  FROM TBintegracao_cobranca_bancaria
		 WHERE DFid_integracao = @ID_INTEGRACAO
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
EXEC sp_cr_TecnoSpeed_Consulta_Impressao_Retorno '6ZMLX7W8A', 
'<Parametros>
  <_status>sucesso</_status>
  <_mensagem>Impressão em processamento</_mensagem>
  <_dados>
    <situacao>PROCESSANDO</situacao>
    <protocolo>0BRPU88QG</protocolo>
  </_dados>
</Parametros>'
*/