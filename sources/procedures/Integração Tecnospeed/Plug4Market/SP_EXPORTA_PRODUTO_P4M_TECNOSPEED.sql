IF OBJECT_ID('SP_EXPORTA_PRODUTO_P4M_TECNOSPEED') IS NOT NULL
    DROP PROCEDURE SP_EXPORTA_PRODUTO_P4M_TECNOSPEED
GO

CREATE PROCEDURE SP_EXPORTA_PRODUTO_P4M_TECNOSPEED(@XML AS XML)    
AS     
    
/*    
    AUTOR......: Edilson Costa    
    AREA.......: Integrações    
    MODULO.....: Comercial      
    DATA/HORA..: 20/01/2025    
    OBJETIVO...: Exportar itens para a API do Plug4Marqket da Tecnospeed    
  
    PARAMETROS.: @COD_EMPRESA - Código da empresa    
                 @COD_TABELA_PRECO - Código da tabela de preços padrão    
  
    RETORNO....: 0 -> Importação OK    
                 Numero da Ocorrencia -> Erro na Importação  
  
    TESTE      :  
  
    DECLARE @COD_EMPRESA      INT = 1  
          , @COD_TABELA_PRECO INT = 1  
       EXEC SP_EXPORTA_PRODUTO_P4M_TECNOSPEED @COD_EMPRESA, @COD_TABELA_PRECO  
  
*/  
    
BEGIN    
    
SET ARITHABORT ON;    
SET NOCOUNT ON;    
    
IF dbo.OBJECT_ID('#TBtemp_itens_expo') IS NOT NULL DROP TABLE #TBtemp_itens_expo     

DECLARE @COD_EMPRESA INT
DECLARE @COD_TABELA_PRECO INT
DECLARE @COD_ITEM INT    
    
SELECT @COD_ITEM  = DFxml.value('*[lower-case(local-name())="dfcod_item_estoque"][1]','INT') 
     , @COD_TABELA_PRECO   = DFxml.value('*[lower-case(local-name())="dfcod_tabela_preco"][1]', 'INT')  
     , @COD_EMPRESA = DFxml.value('*[lower-case(local-name())="dfcod_empresa"][1]' , 'INT')  
  FROM @xml.nodes('./*') AS XMLparametros(DFxml)  

CREATE TABLE #TBtemp_itens_expo     
     ( DFcod_item_estoque INT    
     , DFpreco            DECIMAL(18,4)    
     , DFcod_tabela_preco INT    
     , DFdata_inicio  SMALLDATETIME    
     , DFdata_termino SMALLDATETIME    
     , DFcod_canal_venda  INT    
     , DFpreco_PROMO      DECIMAL(18,4)    
     , DFcod_tabela_preco_PORMO INT    
     , DFcod_canal_venda_PROMO  INT     
     , DFdata_inicio_PROMO SMALLDATETIME    
     , DFdata_termino_PROMO SMALLDATETIME
	 , DFid_unidade_item_estoque INT)    
    
INSERT INTO #TBtemp_itens_expo     
     ( DFcod_item_estoque, DFpreco, DFcod_tabela_preco, DFcod_canal_venda, DFdata_inicio, DFdata_termino, DFid_unidade_item_estoque )    
SELECT TBunidade_item_estoque.DFcod_item_estoque     
     , TBpreco_venda.DFpreco AS DFpreco_normal    
     , TBtabela_preco.DFcod_tabela_preco     
     , TBcanais_venda.DFcod_canal_venda     
     , TBtabela_preco.DFdata_inicio     
     , TBtabela_preco.DFdata_termino
	 , TBpreco_venda.DFid_unidade_item_estoque
  FROM TBtabela_preco (NOLOCK)      
 INNER JOIN TBcanais_venda WITH(NOLOCK)    
    ON TBcanais_venda.DFcod_tabela_preco = TBtabela_preco.DFcod_tabela_preco    
 INNER JOIN TBtabela_preco_empresa (NOLOCK)      
    ON TBtabela_preco_empresa.DFcod_tabela_preco = TBtabela_preco.DFcod_tabela_preco      
 INNER JOIN TBpreco_venda (NOLOCK)      
    ON TBpreco_venda.DFcod_tabela_preco = TBtabela_preco.DFcod_tabela_preco      
 INNER JOIN TBunidade_item_estoque (NOLOCK)      
    ON TBunidade_item_estoque.DFid_unidade_item_estoque = TBpreco_venda.DFid_unidade_item_estoque      
 INNER JOIN TBtipo_preco (NOLOCK)      
    ON TBpreco_venda.DFid_tipo_preco_venda = TBtipo_preco.DFid_tipo_preco     
 WHERE TBtabela_preco_empresa.DFcod_empresa = @COD_EMPRESA    
   AND GETDATE() BETWEEN TBtabela_preco.DFdata_inicio AND TBtabela_preco.DFdata_termino    
   AND TBtipo_preco.DFid_tipo_preco = (DBO.VALIDAR_OPCAO(524,1,0))  
   AND TBunidade_item_estoque.DFcod_item_estoque = @COD_ITEM
 GROUP BY TBunidade_item_estoque.DFcod_item_estoque     
        , TBpreco_venda.DFpreco    
        , TBtabela_preco.DFcod_tabela_preco     
        , TBcanais_venda.DFcod_canal_venda     
        , TBtabela_preco.DFdata_inicio     
        , TBtabela_preco.DFdata_termino 
		, TBpreco_venda.DFid_unidade_item_estoque
 ORDER BY DFcod_item_estoque    
    
UPDATE #TBtemp_itens_expo    
   SET DFpreco_PROMO = QRpromo.DFpreco_promo     
     , DFcod_tabela_preco_PORMO = QRpromo.DFcod_tabela_preco_promo     
     , DFcod_canal_venda_PROMO = QRpromo.DFcod_canal_venda    
     , DFdata_inicio_PROMO = QRpromo.DFdata_inicio     
     , DFdata_termino_PROMO = QRpromo.DFdata_termino     
  FROM #TBtemp_itens_expo AS TBtemp    
 INNER JOIN (SELECT TBunidade_item_estoque.DFcod_item_estoque     
                  , TBpreco_venda.DFpreco AS DFpreco_promo    
                  , TBtabela_preco.DFcod_tabela_preco  AS DFcod_tabela_preco_promo    
                  , TBcanais_venda.DFcod_canal_venda     
                  , TBtabela_preco_promocao.DFdata_inicio     
                  , TBtabela_preco_promocao.DFdata_termino     
               FROM TBtabela_preco (NOLOCK)      
              INNER JOIN TBcanais_venda WITH(NOLOCK)    
                 ON TBcanais_venda.DFcod_tabela_preco = TBtabela_preco.DFcod_tabela_preco    
              INNER JOIN TBtabela_preco_empresa (NOLOCK)      
                 ON TBtabela_preco_empresa.DFcod_tabela_preco = TBtabela_preco.DFcod_tabela_preco      
              INNER JOIN TBpreco_venda (NOLOCK)      
                 ON TBpreco_venda.DFcod_tabela_preco = TBtabela_preco.DFcod_tabela_preco      
              INNER JOIN TBtabela_preco_promocao (NOLOCK)      
                 ON TBtabela_preco_promocao.DFid_tabela_preco_promocao = TBpreco_venda.DFid_tabela_preco_promocao      
                AND GETDATE() BETWEEN TBtabela_preco_promocao.DFdata_inicio AND TBtabela_preco_promocao.DFdata_termino     
                AND TBtabela_preco_promocao.DFativo = 1     
              INNER JOIN TBunidade_item_estoque (NOLOCK)      
                 ON TBunidade_item_estoque.DFid_unidade_item_estoque = TBpreco_venda.DFid_unidade_item_estoque      
              INNER JOIN TBtipo_preco (NOLOCK)      
                 ON TBpreco_venda.DFid_tipo_preco_venda = TBtipo_preco.DFid_tipo_preco      
              INNER JOIN TBtipo_promocao (NOLOCK)      
                 ON TBtipo_promocao.DFid_tipo_promocao = TBtabela_preco_promocao.Dfid_tipo_promocao      
              WHERE TBtabela_preco_empresa.DFcod_empresa = @COD_EMPRESA    
                AND GETDATE() BETWEEN TBtabela_preco.DFdata_inicio AND TBtabela_preco.DFdata_termino    
                AND TBtipo_preco.DFid_tipo_preco = (DBO.VALIDAR_OPCAO(526,1,0))    
              GROUP BY TBunidade_item_estoque.DFcod_item_estoque     
                     , TBpreco_venda.DFpreco     
                     , TBtabela_preco.DFcod_tabela_preco    
                     , TBcanais_venda.DFcod_canal_venda    
                     , TBtabela_preco_promocao.DFdata_inicio     
                     , TBtabela_preco_promocao.DFdata_termino ) AS QRpromo    
    ON QRpromo.DFcod_item_estoque = TBtemp.DFcod_item_estoque    
   AND QRpromo.DFcod_canal_venda = TBtemp.DFcod_canal_venda    
  
SELECT CAST(TBitem_estoque.DFcod_item_estoque AS VARCHAR(50)) AS 'productId'  
     , TBitem_estoque.DFdescricao          AS productName    
     , TBitem_estoque.DFcod_item_estoque   AS sku    
     , TBitem_estoque.DFdescricao_resumida AS 'name'    
     , (SELECT 'true'            AS '@array'  
             , 'int'             AS 'id/@type'  
             , DFcod_canal_venda AS 'id'  
             , 'decimal'         AS 'price/@type'  
             , DFpreco           AS 'price'  
             , (SELECT 'decimal'          AS 'salePrice/@type'  
                     , DFpreco_PROMO      AS 'salePrice'    
                     , DFdata_inicio      AS 'saleDateStart'    
                     , DFdata_termino     AS 'saleDateEnd'    
                  FROM #TBtemp_itens_expo AS TBtempArray2    
                 WHERE TBtempArray2.DFcod_canal_venda  = TBtempArray.DFcod_canal_venda     
                   AND TBtempArray2.DFcod_item_estoque = TBtempArray.DFcod_item_estoque     
                   FOR XML PATH('forSale'), TYPE )  
          FROM (SELECT DFcod_item_estoque
		             , DFcod_canal_venda    
                     , DFpreco
                  FROM #TBtemp_itens_expo     
                 GROUP BY DFcod_item_estoque    
                        , DFcod_canal_venda    
                        , DFpreco) AS TBtempArray    
         WHERE TBtempArray.DFcod_item_estoque = TBitem_estoque.DFcod_item_estoque     
           FOR XML PATH('row'), ROOT('salesChannels'), TYPE )
     , 'nacional' AS 'origin'    
     , 'masculino' as 'gender'    
     , TBdepartamento_item_plug4market.DFchave_plug4market AS 'categoryId'    
     , 'bool'                               AS 'active/@type'  
     , CASE WHEN TBitem_estoque.DFativo_inativo = 1   
            THEN 'true'  
            ELSE 'false'  
        END AS 'active'  
     , 'PADRAO'                                   AS 'brand'    
     , TBitem_estoque.DFdescricao_analitica AS 'description'  
     , 'decimal'                            AS 'width/@type'  
     , TBunidade_item_estoque.DFlargura     AS 'width'  
     , 'decimal'                            AS 'height/@type'  
     , TBunidade_item_estoque.DFaltura      AS 'height'  
     , 'decimal'                            AS 'length/@type'  
     , TBunidade_item_estoque.DFcomprimento AS 'length'  
     , 'decimal'                            AS 'weight/@type'  
     , (TBunidade_item_estoque.DFpeso_bruto * 1000)  AS 'weight'  
     , (SELECT 'true' AS '@array'  
             , 'VERIFICAR ORIGEM DO REGISTRO - LINHA' AS 'key'    
             , 'VERIFICAR ORIGEM DO REGISTRO - Air force 1' AS 'value'     
           FOR XML PATH('row'), ROOT('metafields') , TYPE )
     , ' ' AS 'color'    
     , ' ' AS 'size'    
     , ' ' AS 'voltage'    
     , ' ' AS 'flavor'    
     , ' ' AS 'potency'    
     , 'decimal'                                      AS 'warranty/@type'  
     , 0 AS 'warranty'  
     , 'decimal'                                      AS 'stock/@type'  
     , VWESTOQUE.DFestoque_atual  AS 'stock' 
     , 'decimal'                                      AS 'price/@type'  
     , TBpreco_venda.DFpreco AS 'price'      
     , '' AS 'model'    
     , (SELECT 'true'   AS '@array'  
             , DFimagem AS [text()]  
          FROM TBitem_estoque AS TBimage WITH(NOLOCK)     
         WHERE TBimage.DFcod_item_estoque = TBitem_estoque.DFcod_item_estoque     
           FOR XML PATH, ROOT('images'), TYPE) AS 'images'
     , (SELECT 'true'   AS '@array'  
             , DFimagem AS [text()]  
          FROM TBitem_estoque AS TBimage WITH(NOLOCK)     
         WHERE TBimage.DFcod_item_estoque = TBitem_estoque.DFcod_item_estoque     
           FOR XML PATH, ROOT('videos'), TYPE )  AS 'videos'
     , TBcodigo_barra.DFcodigo_barra AS 'ean'    
     , TBitem_estoque_atacado_Varejo.DFcod_classificacao_fiscal AS 'ncm'  	 
	 , 'decimal' AS 'salePrice/@type'  
     , ISNULL(TBitem.DFpreco_PROMO,0) AS 'salePrice'        
     , CAST(GETDATE() AS SMALLDATETIME) AS 'saleDateStart'    
     , CAST(GETDATE() AS SMALLDATETIME) AS 'saleDateEnd'    
     , TBfornecedor_item.DFpart_number AS 'manufacturerPartNumber'    
     , 'int' AS 'crossDockingDays/@type'  
     , 0 AS 'crossDockingDays'    
     , 'decimal' AS 'unitMultiplier/@type'  
     , TBunidade_item_estoque.DFfator_conversao  AS 'unitMultiplier'    
     , LOWER(DBO.UND(TBunidade_item_estoque.DFid_unidade_item_estoque)) AS 'measurementUnit'    
	 , 'decimal' AS 'costPrice/@type'  
     , VWPRECO1.DFcusto_real AS 'costPrice'  
     , (SELECT 'true'            AS '@array'  
             , 'int'             AS 'id/@type'
             ,  DFid_departamento_item AS 'alternativeId'     
          FROM TBitem_estoque AS TBdepto WITH(NOLOCK)     
         WHERE TBdepto.DFcod_item_estoque = TBitem_estoque.DFcod_item_estoque     
           FOR XML PATH('customCategory'), TYPE )
     , 'false' AS 'reviewed'
     , '2023-12-34567' AS 'anatelCode'
     , '8004730043000' AS 'anvisaCode'
     , '12345678901234' AS 'inmetroCode'
     , 'PR/1234-20' AS 'mapaCode'
  FROM TBitem_estoque WITH(NOLOCK)   
 INNER JOIN #TBtemp_itens_expo AS TBitem
    ON TBitem.DFcod_item_estoque = TBitem_estoque.DFcod_item_estoque 
 INNER JOIN TBdepartamento_item_plug4market WITH(NOLOCK)  
    ON TBdepartamento_item_plug4market.DFid_departamento_item = TBitem_estoque.DFid_departamento_item   
 INNER JOIN TBitem_estoque_atacado_Varejo WITH(NOLOCK)     
    ON TBitem_estoque_atacado_Varejo.DFcod_item_estoque_atacado_Varejo = TBitem_estoque.DFcod_item_estoque    
 INNER JOIN TBunidade_item_estoque WITH(NOLOCK)    
    ON TBunidade_item_estoque.DFcod_item_estoque = TBitem_estoque.DFcod_item_estoque   
   AND TBunidade_item_estoque.DFid_unidade_item_estoque = TBitem.DFid_unidade_item_estoque
 INNER JOIN TBcodigo_barra WITH(NOLOCK)    
    ON TBcodigo_barra.DFid_unidade_item_estoque = TBunidade_item_estoque.DFid_unidade_item_estoque     
  LEFT JOIN TBfornecedor_item WITH(NOLOCK)    
    ON TBfornecedor_item.DFcod_item_estoque = TBitem_estoque.DFcod_item_estoque    
   AND TBfornecedor_item.DFfornecedor_principal = 1    
 INNER JOIN TBpreco_venda WITH (NOLOCK)      
    ON TBpreco_venda.DFid_unidade_item_estoque = TBunidade_item_estoque.DFid_unidade_item_estoque    
 INNER JOIN TBtabela_preco WITH (NOLOCK)      
    ON TBtabela_preco.DFcod_tabela_preco = TBpreco_venda.DFcod_tabela_preco     
 INNER JOIN TBtabela_preco_empresa WITH (NOLOCK)      
    ON TBtabela_preco_empresa.DFcod_tabela_preco = TBtabela_preco.DFcod_tabela_preco      
 INNER JOIN TBtipo_preco WITH (NOLOCK)      
    ON TBpreco_venda.DFid_tipo_preco_venda = TBtipo_preco.DFid_tipo_preco    
 INNER JOIN VWPRECO1     
    ON VWPRECO1.DFcod_empresa = TBtabela_preco_empresa.DFcod_empresa     
   AND VWPRECO1.DFid_unidade_item_estoque = TBunidade_item_estoque.DFid_unidade_item_estoque     
   AND VWPRECO1.DFcod_item_estoque = TBitem_estoque.DFcod_item_estoque 
 INNER JOIN VWESTOQUE     
    ON VWESTOQUE.DFcod_empresa = TBtabela_preco_empresa.DFcod_empresa     
   AND VWESTOQUE.DFid_unidade_item_estoque = TBunidade_item_estoque.DFid_unidade_item_estoque     
   AND VWESTOQUE.DFcod_item_estoque = TBitem_estoque.DFcod_item_estoque
   AND VWESTOQUE.DFid_tipo_estoque = (SELECT DFvalor FROM TBopcoes WHERE DFcodigo = 553)
   AND VWESTOQUE.DFcod_empresa = @COD_EMPRESA
 WHERE TBtabela_preco.DFcod_tabela_preco = @COD_TABELA_PRECO    
   AND TBtabela_preco_empresa.DFcod_empresa = @COD_EMPRESA    
   AND TBitem_estoque.DFcod_item_estoque IN (SELECT DFcod_item_estoque FROM #TBtemp_itens_expo GROUP BY DFcod_item_estoque)  
   AND GETDATE() BETWEEN TBtabela_preco.DFdata_inicio AND TBtabela_preco.DFdata_termino    
   AND TBtipo_preco.DFid_tipo_preco = (DBO.VALIDAR_OPCAO(524,1,0)) 
   AND TBunidade_item_estoque.DFcod_item_estoque = @COD_ITEM 
 GROUP BY CAST(TBitem_estoque.DFcod_item_estoque AS VARCHAR(50)) 
        , TBitem_estoque.DFdescricao            
        , TBitem_estoque.DFcod_item_estoque     
        , TBitem_estoque.DFdescricao_resumida  
        , TBdepartamento_item_plug4market.DFchave_plug4market                  
        , CASE WHEN TBitem_estoque.DFativo_inativo = 1 THEN 'true' ELSE 'false' END         
        , TBitem_estoque.DFdescricao_analitica 
        , TBunidade_item_estoque.DFlargura     
        , TBunidade_item_estoque.DFaltura      
        , TBunidade_item_estoque.DFcomprimento 
        , (TBunidade_item_estoque.DFpeso_bruto * 1000)  
        , VWESTOQUE.DFestoque_atual 
        , TBpreco_venda.DFpreco
        , TBcodigo_barra.DFcodigo_barra    
        , TBitem_estoque_atacado_Varejo.DFcod_classificacao_fiscal           
        , ISNULL(TBitem.DFpreco_PROMO,0)
        , TBfornecedor_item.DFpart_number 
        , TBunidade_item_estoque.DFfator_conversao     
        , VWPRECO1.DFcusto_real  
        ,TBunidade_item_estoque.DFid_unidade_item_estoque
      FOR XML PATH('row'), TYPE   
  
END

