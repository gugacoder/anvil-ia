IF dbo.OBJECT_ID('sp_cr_TecnoSpeed_Cedente_Retorno') IS NOT NULL DROP PROCEDURE sp_cr_TecnoSpeed_Cedente_Retorno
GO

CREATE PROCEDURE sp_cr_TecnoSpeed_Cedente_Retorno( @XML XML )
WITH ENCRYPTION 
AS
BEGIN TRY 
    SET NOCOUNT ON

	DECLARE @STATUS NVARCHAR(10), 
			@MSG_ERRO NVARCHAR(MAX)

	IF dbo.OBJECT_ID( 'tempdb..#TBtemp_cedente' ) IS NOT NULL DROP TABLE #TBtemp_cedente

	SELECT ref.value('(*[lower-case(local-name())="_status"])[1]', 'nvarchar(10)') AS DFstatus
	     , ref.value('(*[lower-case(local-name())="_mensagem"])[1]', 'nvarchar(100)') AS DFmensagem
		 , ref.value('(./_dados/*[lower-case(local-name())="cpf_cnpj"])[1]', 'nvarchar(20)') AS DFcpf_cnpj
		 , ref.value('(./_dados/*[lower-case(local-name())="id"])[1]', 'bigint') AS DFid_cedente_tecno
		 , ref.value('(./_dados/*[lower-case(local-name())="token_cedente"])[1]', 'nvarchar(50)') AS DFtoken_cedente
		 , ref.value('(./_dados/*[lower-case(local-name())="id_software_house"])[1]', 'bigint') AS DFid_software_house
		 , ref.value('(./_dados/*[lower-case(local-name())="situacao"])[1]', 'nvarchar(10)') AS DFsituacao
		 , ref.value('(./_dados/*[lower-case(local-name())="_campo"])[1]', 'nvarchar(20)') AS DFcampo
		 , ref.value('(./_dados/*[lower-case(local-name())="_erro"])[1]', 'nvarchar(100)') AS DFerro
	  INTO #TBtemp_cedente
	  FROM @XML.nodes('//Parametros') XML( ref )

	SELECT TOP 1
		   @STATUS = UPPER(DFstatus), 
		   @MSG_ERRO = 'Mensagem: ' + DFmensagem + char(13) + 'Campo: ' + DFcampo + char(13) + 'Erro: ' + DFerro
	  FROM #TBtemp_cedente

	IF @STATUS = 'SUCESSO' BEGIN
		INSERT INTO TBcedente_tecnospeed( DFcod_empresa, DFcod_cedente_tecno, DFtoken_cedente, DFcod_software_house )
		SELECT TBempresa.DFcod_empresa, TBtemp.DFid_cedente_tecno, ISNULL(TBtemp.DFtoken_cedente,''), ISNULL(TBtemp.DFid_software_house,0)
		  FROM #TBtemp_cedente AS TBtemp
		 INNER JOIN TBempresa WITH (NOLOCK)
			ON TBtemp.DFcpf_cnpj = TBempresa.DFcgc_cei_cpf 
		 WHERE TBempresa.DFcod_empresa NOT IN (SELECT DFcod_empresa FROM TBcedente_tecnospeed)
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
EXEC sp_cr_TecnoSpeed_Cadastrar_Cedente 
'<root>
     <_status>sucesso</_status>
     <_dados>
         <id>728</id>
         <razaosocial>Empresa Ltda</razaosocial>
         <nomefantasia>Empresa</nomefantasia>
         <cpf_cnpj>20841251000106</cpf_cnpj>
         <logradouro>Av. Analista Jucá de Souza</logradouro>
         <numero>123</numero>
         <complemento>sala 987</complemento>
         <bairro>Centro</bairro>
         <cep>87012345</cep>
         <id_cidade>2136</id_cidade>
         <telefone>4430331234</telefone>
         <email>cobranca@boleto.com.br</email>
         <criado>2018-05-16T19:13:30Z</criado>
         <atualizado>2018-05-16T19:13:30Z</atualizado>
         <token_cedente>9d03331b377ab63d5f070206059686ae</token_cedente>
         <token_esales>0</token_esales>
         <situacao>ATIVO</situacao>
         <id_software_house>23</id_software_house>
         <config_email></config_email>
         <config_notificacao></config_notificacao>
         <motivo_inativacao></motivo_inativacao>
         <data_ativacao>2018-05-16T19:13:30Z</data_ativacao>
         <data_inativacao></data_inativacao>
         <certificado></certificado>
         <dtvencimentocertificado></dtvencimentocertificado>
         <uf>PR</uf>
         <cidadeibge>4115200</cidadeibge>
         <cidade>Maringá</cidade>
     </_dados>
 </root>
'
SELECT * FROM TBcedente_tecnospeed
*/