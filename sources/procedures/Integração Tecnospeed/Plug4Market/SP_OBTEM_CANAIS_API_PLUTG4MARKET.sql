IF OBJECT_ID('SP_OBTEM_CANAIS_API_PLUTG4MARKET') IS NOT NULL
    DROP PROCEDURE SP_OBTEM_CANAIS_API_PLUTG4MARKET
GO

CREATE PROCEDURE SP_OBTEM_CANAIS_API_PLUTG4MARKET (@XML AS XML)     
AS   
BEGIN    
    
 /*    
 AUTOR......: EDILSON COSTA    
 AREA.......: COMERCIAL    
 MODULO.....: RETAGUARDA VAREJO / FATURAMENTO    
 DATA/HORA..: 13/01/2024    
    
 FUNÇÃO.....: RECEBER CANAIS DE VENDA DA API DO SERVIÇO Plug4Market pelo XML RECEBIDO NO PARÂMETRO    
    
 PARÂMETROS.: @XML XML    
    
 EXEMPLO....: EXEC SP_OBTEM_CANAIS_API_PLUTG4MARKET ==> xml       
 */    
    
 CREATE TABLE #TBcanais_venda    
      ( DFcod_canal_venda  INT NOT NULL    
      , DFdescricao        NVARCHAR(MAX)    
      , DFcod_tipo_venda   INT NULL    
      , DFcod_tabela_preco INT NULL )    
 
 BEGIN TRY

	SELECT @XML AS DFxml INTO #TBtemp_xml    
    
	 INSERT INTO #TBcanais_venda    
		  ( DFcod_canal_venda    
		  , DFdescricao    
		  , DFcod_tipo_venda    
		  , DFcod_tabela_preco )    
	 SELECT X.dados.query('id'  ).value('.', 'INT')               
		  , X.dados.query('name').value('.', 'NVARCHAR(MAX)')     
		  , NULL    
		  , NULL      
	   FROM #TBtemp_xml WITH(NOLOCK)    
	  CROSS APPLY DFxml.nodes('//Parametros/data') AS X(dados)    
  
	 INSERT INTO TBcanais_venda    
		  ( DFcod_canal_venda    
		  , DFdescricao    
		  , DFcod_tipo_venda    
		  , DFcod_tabela_preco )    
	 SELECT DFcod_canal_venda    
		  , DFdescricao    
		  , DFcod_tipo_venda    
		  , DFcod_tabela_preco    
	   FROM #TBcanais_venda    
	  WHERE DFcod_canal_venda NOT IN (SELECT DFcod_canal_venda FROM TBcanais_venda)    
	  ORDER BY DFcod_canal_venda  
    
	 UPDATE TBcanais_venda    
		SET DFdescricao = TBtemp.DFdescricao    
	   FROM TBcanais_venda    
	  INNER JOIN #TBcanais_venda AS TBtemp    
		 ON TBtemp.DFcod_canal_venda = TBcanais_venda.DFcod_canal_venda    
    
END TRY
BEGIN CATCH
	
	INSERT INTO TBlog_erro_integracao 
         ( DFdata_log
         , DFxml
         , DFrotina
         , DFdescricao_erro)  
    SELECT GETDATE()
         , @XML
	     , 'SP_OBTEM_CANAIS_API_PLUTG4MARKET'
		 , (SELECT CAST(@@ERROR AS NVARCHAR(MAX)))

END CATCH
 
    
END 