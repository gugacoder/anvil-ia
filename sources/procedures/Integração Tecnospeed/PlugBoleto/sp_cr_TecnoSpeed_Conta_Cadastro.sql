IF dbo.OBJECT_ID('sp_cr_TecnoSpeed_Conta_Cadastro') IS NOT NULL DROP PROCEDURE sp_cr_TecnoSpeed_Conta_Cadastro
GO

CREATE PROCEDURE sp_cr_TecnoSpeed_Conta_Cadastro( @ID_CONTA INT)
WITH ENCRYPTION 
AS 
BEGIN TRY 
    SET NOCOUNT ON

	SELECT DISTINCT 
		  'true' as '@omitir'
		 , DFcod_banco AS ContaCodigoBanco
		 , DFnum_agencia AS ContaAgencia
		 , DFdig_agencia AS ContaAgenciaDV
		 , DFnum_conta AS ContaNumero
		 , DFdig_conta AS ContaNumeroDV
		 , DFtipo_conta AS ContaTipo
		 , DFcodigo_beneficiario AS ContaCodigoBeneficiario
		 , DFbanco_correspondente AS ContaCodigoBancoCorrespondente
		 , DFcodigo_empresa AS ContaCodigoEmpresa
		 , 'boolean' as 'ContaValidacaoAtiva/@Type'
		 , CASE DFvalidacao_ativa WHEN 1 THEN 'true' ELSE 'false' END AS ContaValidacaoAtiva
		 , 'boolean' as 'ContaImpressaoAtualizada/@Type'
		 , CASE DFimpressao_atualizada WHEN 1 THEN 'true' ELSE 'false' END AS ContaImpressaoAtualizada
		 , 'boolean' as 'ContaImpressaoAtualizadaAlteracao/@Type'
		 , CASE DFimpressao_alteracao WHEN 1 THEN 'true' ELSE 'false' END AS ContaImpressaoAtualizadaAlteracao
		 , 'boolean' as 'ContaImpressaoAtualizadaLiquidado/@Type'
		 , CASE DFimpressao_liquidado WHEN 1 THEN 'true' ELSE 'false' END AS ContaImpressaoAtualizadaLiquidado
	  FROM VWtecnospeed_cadastros AS TBconta
	 INNER JOIN TBcedente_tecnospeed WITH (NOLOCK)
		ON TBconta.DFcod_empresa = TBcedente_tecnospeed.DFcod_empresa 
	 WHERE TBconta.DFid_conta = @ID_CONTA
	   AND TBconta.DFid_conta NOT IN (SELECT DFid_conta FROM TBconta_tecnospeed WITH (NOLOCK))
	   FOR XML PATH ('Conta'), TYPE

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
EXEC sp_cr_TecnoSpeed_Conta_Cadastro 4
*/