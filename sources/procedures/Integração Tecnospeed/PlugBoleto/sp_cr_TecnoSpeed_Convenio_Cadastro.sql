IF dbo.OBJECT_ID('sp_cr_TecnoSpeed_Convenio_Cadastro') IS NOT NULL DROP PROCEDURE sp_cr_TecnoSpeed_Convenio_Cadastro
GO

CREATE PROCEDURE sp_cr_TecnoSpeed_Convenio_Cadastro( @COD_CONFIG_CARTEIRA INT )
WITH ENCRYPTION 
AS 
BEGIN TRY 
    SET NOCOUNT ON

	SELECT DISTINCT 
		   'true' as '@omitir'
		 , DFnumero_convenio AS ConvenioNumero
		 , DFdescricao_convenio AS ConvenioDescricao
		 , DFnum_carteira AS ConvenioCarteira
		 , DFcod_carteira AS carteira_codigo
		 , DFespecie_convenio AS ConvenioEspecie
		 , DFpadrao_cnab AS ConvenioPadraoCNAB
		 , 'boolean' as 'ConvenioReiniciarDiariamente/@Type'
		 , CASE DFreiniciar_remessa WHEN 1 THEN 'true' ELSE 'false' END AS ConvenioReiniciarDiariamente
		 , DFnumero_remessa AS ConvenioNumeroRemessa
		 , 'integer' as 'id_conta_tecno/@Type'
		 , DFcod_conta_tecno AS Conta
		 , NULL AS ConvenioDensidaDeRemessa
		 , 'boolean' as 'ConvenioRegistroInstantaneo/@Type'
		 , CASE DFregistro_instantaneo WHEN 1 THEN 'true' ELSE 'false' END AS ConvenioRegistroInstantaneo
		 , NULL AS ConvenioApiId
		 , NULL AS ConvenioApiKey
		 , NULL AS ConvenioApiSecret
		 , NULL AS ConvenioEstacao
		 , 'boolean' as 'ConvenioNossoNumeroBanco/@Type'
		 , CASE DFnosso_numero_banco WHEN 1 THEN 'true' ELSE 'false' END AS ConvenioNossoNumeroBanco
		 , 'boolean' as 'ConvenioNossoNumeroConciliarBanco/@Type'
		 , CASE DFnosso_numero_conciliar WHEN 1 THEN 'true' ELSE 'false' END AS ConvenioNossoNumeroConciliarBanco
		 , NULL AS Conveniotipowebservice
		 , 'boolean' as 'ConvenioConsultaws/@Type'
		 , CASE DFconsulta_webservice WHEN 1 THEN 'true' ELSE 'false' END AS ConvenioConsultaws
		 , DFnumero_convenio AS ConvenioNumeroContrato
		 , NULL AS ConvenioVersaoLayoutArquivo
		 , 'boolean' as 'ConvenioAlteracaoWebservice/@Type'
		 , CASE DFalteracao_webservice WHEN 1 THEN 'true' ELSE 'false' END AS ConvenioAlteracaoWebservice
	  FROM VWtecnospeed_cadastros AS TBconvenio
	 INNER JOIN TBconta_tecnospeed WITH (NOLOCK)
		ON TBconvenio.DFid_conta = TBconta_tecnospeed.DFid_conta 
	 WHERE DFcod_configuracao_carteira_cobranca = @COD_CONFIG_CARTEIRA
	   AND DFcod_configuracao_carteira_cobranca NOT IN (SELECT DFcod_configuracao_carteira FROM TBconvenio_tecnospeed)
	   FOR XML PATH ('Convenio'), TYPE

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
EXEC sp_cr_TecnoSpeed_Convenio_Cadastro 3
*/