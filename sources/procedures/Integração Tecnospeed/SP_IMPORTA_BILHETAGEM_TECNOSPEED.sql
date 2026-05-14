IF OBJECT_ID('SP_IMPORTA_BILHETAGEM_TECNOSPEED') IS NOT NULL
    DROP PROCEDURE SP_IMPORTA_BILHETAGEM_TECNOSPEED
GO

CREATE PROCEDURE SP_IMPORTA_BILHETAGEM_TECNOSPEED(@XML AS XML)    
AS     
    
/*    
    AUTOR......: Edilson Costa    
    AREA.......: Integrações    
    MODULO.....: Comercial      
    DATA/HORA..: 31/07/2025    
    OBJETIVO...: Controle de Bilhetagem por CNPJ - Tecnospeed    
  
    PARAMETROS.: xml    
  
    RETORNO....: 0 -> Importação OK    
                 Numero da Ocorrencia -> Erro na Importação  
  
*/  
    
BEGIN    
    
SET ARITHABORT ON;    
SET NOCOUNT ON;    

CREATE TABLE #TBTEMP_bilhetagem_tecnospeed    
      ( cnpj nvarchar(50)
      , total INT )
 
 
 BEGIN TRY

     SELECT @XML AS DFxml INTO #TBtemp_xml    
   
     INSERT INTO #TBTEMP_bilhetagem_tecnospeed   
          ( cnpj    
          , total )
     SELECT X.dados.query('cnpj').value('.', 'NVARCHAR(50)')               
          , X.dados.query('total').value('.', 'INT')       
       FROM #TBtemp_xml WITH(NOLOCK)    
      CROSS APPLY DFxml.nodes('//Parametros/_dados/cedentes') AS X(dados)    
  
    INSERT INTO TBbilhetagem_tecnospeed
         ( DFcod_cliente 
	     , DFquantidade_emitida 
	     , DFdata_atualizacao
         , DFtipo_produto_api )
    SELECT TBcliente.DFcod_cliente
         , TBtemp.total
         , GETDATE() 
         , 'API PLUGBOLETOS'
      FROM TBcliente WITH(NOLOCK)
     INNER JOIN #TBTEMP_bilhetagem_tecnospeed AS TBtemp
        ON LTRIM(RTRIM(TBtemp.cnpj)) = LTRIM(RTRIM(TBcliente.DFcnpj_cpf)) 
     WHERE TBcliente.DFdata_inativacao IS NULL
       AND TBcliente.DFbloqueado IS NULL

END TRY

BEGIN CATCH
    
    DECLARE @ERRO AS NVARCHAR(MAX)
    SET @ERRO = (SELECT CAST(@@ERROR AS NVARCHAR(MAX)))

    EXEC SP_GRAVA_LOG_ERRO_INTEGRACAO @XML, 'SP_IMPORTA_BILHETAGEM_TECNOSPEED', @ERRO

END CATCH

END