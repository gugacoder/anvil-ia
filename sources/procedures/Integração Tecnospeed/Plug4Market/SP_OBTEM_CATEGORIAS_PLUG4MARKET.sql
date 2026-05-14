IF OBJECT_ID('SP_OBTEM_CATEGORIAS_PLUG4MARKET') IS NOT NULL
    DROP PROCEDURE SP_OBTEM_CATEGORIAS_PLUG4MARKET
GO

CREATE PROCEDURE SP_OBTEM_CATEGORIAS_PLUG4MARKET (@XML AS XML)     
AS   
BEGIN    
    
 /*    
 AUTOR......: EDILSON COSTA    
 AREA.......: COMERCIAL    
 MODULO.....: RETAGUARDA VAREJO / FATURAMENTO    
 DATA/HORA..: 21/02/2025    
    
 FUNÇÃO.....: RECEBER OS ID'S DAS CATEGORIAS CRIADAS NA API TECNOSPEED/PLUG4MARKET
    
 PARÂMETROS.: @XML XML    
    
 EXEMPLO....: EXEC SP_OBTEM_CATEGORIAS_PLUG4MARKET ==> xml       
 
 JASON QUE VIRÁ DE RETORNO E CONVERTIDO EM XML PARA SER UTILIZADO PELA PROCEDURE
	[
		{
			"id": "67b86aea4032ab001235e010",
			"alternativeId": "212",
			"parent": "#",
			"text": "ATIVO IMOBILIZADO",
			"children": true
		},
		{
			"id": "67b86ae74032ab001235dff7",
			"alternativeId": "20",
			"parent": "#",
			"text": "COLETA/GERENCIAMENTO DE RESIDUOS",
			"children": true
		},
   
		{
	]
 */
    
 CREATE TABLE #TBdepartamento_item_plug4market    
      ( DFid_departamento_item INT
      , DFchave_plug4market NVARCHAR(MAX) )
    
 SELECT @XML AS DFxml INTO #TBtemp_xml    
    
 INSERT INTO #TBdepartamento_item_plug4market    
      ( DFid_departamento_item    
      , DFchave_plug4market )
 SELECT X.dados.query('alternativeId'  ).value('.', 'INT')               
      , X.dados.query('id').value('.', 'NVARCHAR(MAX)')       
   FROM #TBtemp_xml WITH(NOLOCK)    
  CROSS APPLY DFxml.nodes('//Parametros/item') AS X(dados)    

 INSERT INTO TBdepartamento_item_plug4market    
      ( DFid_departamento_item    
      , DFchave_plug4market)    
 SELECT DFid_departamento_item    
      , NULL    
   FROM TBdepartamento_item WITH(NOLOCK) 
  WHERE DFid_departamento_item NOT IN (SELECT DFid_departamento_item FROM TBdepartamento_item_plug4market WITH(NOLOCK) )    
  ORDER BY DFid_departamento_item  
    
 UPDATE TBdepartamento_item_plug4market    
    SET DFchave_plug4market = TBtemp.DFchave_plug4market    
   FROM TBdepartamento_item_plug4market    
  INNER JOIN #TBdepartamento_item_plug4market AS TBtemp    
     ON TBtemp.DFid_departamento_item = TBdepartamento_item_plug4market.DFid_departamento_item    
    
 INSERT INTO TBlog_integracao_xml_logistica    
 VALUES (getdate(), @XML, 'SP_OBTEM_CATEGORIAS_PLUG4MARKET')    
    
 --SELECT * 
   --FROM TBdepartamento_item_plug4market WITH(NOLOCK) 

   
--select * from TBlog_integracao_xml_logistica where dfrotina = 'SP_OBTEM_CATEGORIAS_PLUG4MARKET'
    
END 



