IF dbo.OBJECT_ID('sp_cr_TecnoSpeed_Cedente_Cadastro') IS NOT NULL DROP PROCEDURE sp_cr_TecnoSpeed_Cedente_Cadastro
GO

CREATE PROCEDURE sp_cr_TecnoSpeed_Cedente_Cadastro( @COD_EMPRESA INT)
WITH ENCRYPTION 
AS
BEGIN TRY 
    SET NOCOUNT ON

	SELECT DISTINCT 
		   'true' as '@omitir' ,
		   DFrazao_social AS CedenteRazaoSocial, 
		   DFnome_fantasia AS CedenteNomeFantasia, 
		   DFcnpj_empresa AS CedenteCPFCNPJ, 
		   DFendereco AS CedenteEnderecoLogradouro, 
		   DFnum_endereco AS CedenteEnderecoNumero, 
		   DFcomplemento_endereco AS CedenteEnderecoComplemento, 
		   DFbairro AS CedenteEnderecoBairro, 
		   DFcep AS CedenteEnderecoCEP, 
		   DFcod_localidade_IBGE AS CedenteEnderecoCidadeIBGE, 
		   DFtelefone AS CedenteTelefone, 
		   DFe_mail AS CedenteEmail 
	  FROM VWtecnospeed_cadastros
	 WHERE DFcod_empresa = @COD_EMPRESA
	   AND DFcod_empresa NOT IN (SELECT DFcod_empresa FROM TBcedente_tecnospeed WITH (NOLOCK))
	   FOR XML PATH ('Cedente'), TYPE

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
EXEC sp_cr_TecnoSpeed_Cedente_Cadastro 1
*/