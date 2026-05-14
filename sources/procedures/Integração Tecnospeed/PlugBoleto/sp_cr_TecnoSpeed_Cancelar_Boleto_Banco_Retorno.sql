IF dbo.OBJECT_ID('sp_cr_TecnoSpeed_Cancelar_Boleto_Banco_Retorno') IS NOT NULL DROP PROCEDURE sp_cr_TecnoSpeed_Cancelar_Boleto_Banco_Retorno
GO

CREATE PROCEDURE sp_cr_TecnoSpeed_Cancelar_Boleto_Banco_Retorno( @ID_INTEGRACAO NVARCHAR(20), @XML XML )
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
			@SITUACAO NVARCHAR(50), 
			@MSG_ERRO NVARCHAR(4000)

	-- GRAVA LOG ----------------------------------------------------------------------
	SET @DATA_LOG = (CONVERT( DATETIME, CONVERT( NVARCHAR, GETDATE(), 120 )))

	INSERT INTO TBintegracao_cobranca_bancaria_log( DFdata_log, DFxml, DFrotina )
		 SELECT @DATA_LOG, @XML, 'sp_cr_TecnoSpeed_Cancelar_Boleto_Banco_Retorno'

	IF @@ROWCOUNT <> 0 BEGIN
		SET @ID_LOG = ( SCOPE_IDENTITY() )
	END

	IF @ID_LOG = 0 BEGIN
		SET @MSG_ERRO = 'Erro ao gravar log de Integração Cobrança Bancaria'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END
	-----------------------------------------------------------------------------------

	IF @STATUS <> 'SUCESSO' BEGIN	
		SET @MSG_ERRO = 'Status de Retorno diferente de SUCESSO. (' + @STATUS + ')'
		RAISERROR( @MSG_ERRO, 16, 1 )
	END

	SELECT @SITUACAO = ref.value('(*[lower-case(local-name())="situacao"])[1]', 'nvarchar(50)') 
		 , @MSG_ERRO = ISNULL(ref.value('(*[lower-case(local-name())="_erro"])[1]', 'nvarchar(4000)'), '') 
	  FROM @XML.nodes('//Parametros/_dados') XML( ref )
    --------------------------------------------------------------------------------------------------------------

	IF @MSG_ERRO <> '' BEGIN
		RAISERROR( @MSG_ERRO, 16, 1 )
	END

	IF @STATUS = 'SUCESSO' BEGIN
		UPDATE TBintegracao_cobranca_bancaria
		   SET DFconsultar = 1
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
		UPDATE TBintegracao_cobranca_bancaria_log SET DFdescricao_erro = @ErrorMessage WHERE DFid_integracao_log = @ID_LOG 
	END
	----------------------------------------------------

    SET NOCOUNT OFF

END CATCH
GO
/*
DECLARE @XML XML
SET @XML = 
 '<Parametros>
     <_status>sucesso</_status>
     <_dados>
         <_sucesso>
             <idintegracao>BJSdV7dYz</idintegracao>
         </_sucesso>
     </_dados>
 </Parametros>'
EXEC sp_cr_TecnoSpeed_Descartar_Boleto_Retorno @XML
*/
