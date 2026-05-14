
IF DBO.OBJECT_ID('SP_IMPORTA_PEDIDOS_P4M_TECNOSSPEED') IS NOT NULL DROP PROCEDURE SP_IMPORTA_PEDIDOS_P4M_TECNOSSPEED
GO

CREATE PROCEDURE SP_IMPORTA_PEDIDOS_P4M_TECNOSSPEED ( @XML AS XML )  
AS 
SET NOCOUNT ON  


    IF OBJECT_ID('tempdb.dbo.#TBtemp_xml', 'u') IS NOT NULL BEGIN
	    DROP TABLE #TBtemp_xml
    END 

    IF OBJECT_ID('tempdb.dbo.#TBtemp_itens_xml', 'u') IS NOT NULL BEGIN
	    DROP TABLE #TBtemp_itens_xml
    END 

    DECLARE @ERROR NVARCHAR(MAX)
    DECLARE @COD_REPRESENTANTE AS INT
    DECLARE @COD_TABELA_PRECO AS INT
    DECLARE @COD_PLANO_PAGAMENTO AS INT
    DECLARE @COD_STATUS AS NVARCHAR(2)

    SET @COD_REPRESENTANTE = 131
    SET @COD_TABELA_PRECO = 18
    SET @COD_STATUS =  'D'
    SET @COD_PLANO_PAGAMENTO = 1

    CREATE TABLE #TBtemp_xml
         ( id           NVARCHAR(MAX)
         , documentId   NVARCHAR(2000)
	     , street       NVARCHAR(2000)
         , streetNumber NVARCHAR(2000)
	     , district     NVARCHAR(2000)
         , zipCode      NVARCHAR(2000)
	     , city         NVARCHAR(2000)
	     , state        NVARCHAR(2000)
	     , name         NVARCHAR(2000)
	     , phone        NVARCHAR(200)
	     , email        NVARCHAR(200)
         , saleChannelDocumentId NVARCHAR(2000)
         , totalAmount NVARCHAR(200) 
         , saleChannel NVARCHAR(10))

    CREATE TABLE #TBtemp_itens_xml
         ( id         NVARCHAR(MAX)
         , productId  NVARCHAR(200)
	     , quantity   NVARCHAR(200)
	     , price      NVARCHAR(200)
	     , discount   NVARCHAR(200)
         , total      NVARCHAR(200)
	     , freight    NVARCHAR(200) )

    INSERT INTO #TBtemp_xml
    SELECT pedido.value('(id)[1]'                   , 'NVARCHAR(MAX)')
         , pedido.value('(billing/documentId)[1]'   , 'NVARCHAR(2000)')
	     , pedido.value('(billing/street)[1]'       , 'NVARCHAR(2000)')
         , pedido.value('(billing/streetNumber)[1]' , 'NVARCHAR(2000)')
	     , pedido.value('(billing/district)[1]'     , 'NVARCHAR(2000)')
         , pedido.value('(billing/zipCode)[1]'      , 'NVARCHAR(2000)')
	     , pedido.value('(billing/city)[1]'         , 'NVARCHAR(2000)')
	     , pedido.value('(billing/state)[1]'        , 'NVARCHAR(2000)')
	     , pedido.value('(billing/name)[1]'         , 'NVARCHAR(2000)')
	     , pedido.value('(billing/phone)[1]'        , 'NVARCHAR(200)')
	     , pedido.value('(billing/email)[1]'        , 'NVARCHAR(200)')
         , pedido.value('(saleChannelDocumentId)[1]', 'NVARCHAR(2000)')
         , pedido.value('(totalAmount)[1]'          , 'NVARCHAR(2000)')
         , pedido.value('(saleChanne)[1]'           , 'NVARCHAR(10)')
      FROM @xml.nodes('Parametros') AS T(pedido);

    INSERT INTO #TBtemp_itens_xml
    SELECT pedido.value('(id)[1]'                   , 'NVARCHAR(MAX)')
	     , pedido.value('(orderItems/productId)[1]' , 'NVARCHAR(2000)')
         , pedido.value('(orderItems/quantity)[1]'  , 'NVARCHAR(2000)')
	     , pedido.value('(orderItems/price)[1]'     , 'NVARCHAR(2000)')
         , pedido.value('(orderItems/discount)[1]'  , 'NVARCHAR(2000)')
	     , pedido.value('(orderItems/total)[1]'     , 'NVARCHAR(2000)')
	     , pedido.value('(orderItems/freight)[1]'   , 'NVARCHAR(2000)')
      FROM @xml.nodes('Parametros') AS T(pedido);

      select * from #TBtemp_xml
      select * from #TBtemp_itens_xml

BEGIN TRY

	INSERT INTO  TBintegracao_cliente_terceiros
		 ( DFdata_cadastro
		 , DFrazao_social
		 , DFnome_fantasia
		 , DFcnpj_cpf
		 , DFinscr_estadual
		 , DFcod_segmento_cliente
		 , DFfisico_juridico
		 , DFendereco
		 , DFbairro
		 , DFcidade
		 , DFuf
		 , DFcomplemento_endereco
		 , DFcep
		 , DFcontato1
		 , DFtel_contato1
		 , DFemail_contato1
		 , DFcontato2
		 , DFtel_contato2
		 , DFemail_contato2
		 , DFreferencia_comercial 
		 , DFimportado )
	SELECT DISTINCT GETDATE() AS DFdata_cadastro
         , UPPER(name) AS DFrazao_social
         , UPPER(name) AS DFnome_fantasia
         , documentId
         , NULL AS DFinscr_estadual
         , NULL AS DFcod_segmento_cliente
         , CASE WHEN LEN(TRIM(documentId)) > 0 THEN 'J' ELSE IIF(LEN(TRIM(documentId)) > 11 , 'J', 'F') END AS DFfisico_juridico
         , UPPER(street)
         , UPPER(district)
         , UPPER(city)
         , UPPER(state)
         , streetNumber AS DFcomplemento_endereco
         , zipCode				
         , NULL AS DFcontato1
         , phone
         , email
         , NULL AS DFcontato2
         , NULL AS DFtel_contato2
         , NULL AS DFemail_contato2
         , NULL AS DFreferencia_comercial
         , 0 AS DFimportado
      FROM #TBtemp_xml 
     WHERE TRIM(documentId) NOT IN (SELECT TRIM(DFcnpj_cpf) AS DFcnpj_cpf FROM TBcliente WITH(NOLOCK))
       AND TRIM(documentId) NOT IN (SELECT TRIM(DFcnpj_cpf) AS DFcnpj_cpf FROM TBintegracao_cliente_terceiros WITH(NOLOCK))
   
END TRY BEGIN CATCH
	SET @ERROR = 'ERRO INSERINDO REGISTROS TBintegracao_cliente_terceiros'
	EXEC SP_GRAVA_LOG_ERRO_INTEGRACAO @XML, 'SP_IMPORTA_PEDIDOS_P4M_TECNOSSPEED', @ERROR  
	SELECT @ERROR
END CATCH

select * from TBintegracao_cliente_terceiros

BEGIN TRY 

	DECLARE @RETORNO  AS INT
	DECLARE @MENSAGEM AS NVARCHAR(500)
	DECLARE @COD_CLIENTE AS INT 

	DECLARE CURSOR_CLIENTE CURSOR FOR SELECT DFid
	                                    FROM TBintegracao_cliente_terceiros
	                                   WHERE TRIM(DFcnpj_cpf) IN (SELECT DISTINCT 
									                                     CASE WHEN LEN(TRIM(documentId)) > 0 
									                                     THEN TRIM(documentId)  
																	     ELSE TRIM(documentId) END  AS DFcnpj_cpf 
																	FROM #TBtemp_xml )
	   OPEN CURSOR_CLIENTE
	  FETCH NEXT FROM CURSOR_CLIENTE INTO @COD_CLIENTE

	  WHILE @@FETCH_STATUS = 0
	  BEGIN

			SET @RETORNO = 0
			SET @MENSAGEM = ''

			EXEC SP_IT_IMPORTACAO_CLIENTE @RETORNO, @MENSAGEM, @COD_CLIENTE

	  FETCH NEXT FROM CURSOR_CLIENTE INTO @COD_CLIENTE
	    END
      CLOSE CURSOR_CLIENTE;
	DEALLOCATE CURSOR_CLIENTE;

			
END TRY BEGIN CATCH
	SET @ERROR = 'ERRO INSERINDO REGISTROS sp_ft_Importacao_Clientes_Site' + @MENSAGEM
	EXEC SP_GRAVA_LOG_ERRO_INTEGRACAO @XML, 'SP_IMPORTA_PEDIDOS_P4M_TECNOSSPEED + SP_IT_IMPORTACAO_CLIENTE', @MENSAGEM
	SELECT @ERROR
	RETURN;
END CATCH


BEGIN TRANSACTION 
	
	DECLARE @DFid_pedido_venda_integracao INT
	DECLARE @DFid NVARCHAR(MAX)

	DECLARE CURSOR_XML CURSOR FOR
	 SELECT DFid_pedido_venda_integracao
		  , DFid_integracao
	   FROM TBpedido_venda_integracao
	  WHERE DFid_integracao IN (SELECT id FROM #TBtemp_xml)

	   OPEN CURSOR_XML

	  FETCH NEXT FROM CURSOR_XML
	   INTO @DFid_pedido_venda_integracao, @DFid

	  WHILE @@FETCH_STATUS = 0
	  BEGIN
			
			BEGIN TRY

				INSERT INTO TBpedido_venda_site
					 ( Codigo_Vendedor_Palm	
					 , NumeroPedidoAFV	
					 , CnpjCpf	
					 , Data	
					 , Hora	
					 , TipoPedido
					 , CodigoCondicaoPagamento 	
					 , CodigoFormaPagamento
					 , CodigoTabelaPreco
					 , Observação
					 , NumeroItens
					 , TotalItens 	
					 , DescontoFinanceiroPercentual
					 , TotalPedido
					 , Status
					 , Urgente
					 , Prazo1
					 , Prazo2
					 , Prazo3
					 , Prazo4
					 , Prazo5
					 , CodigoVisita
					 , NumeroFechamento
					 , CodigoEncarte
					 , CodigoCasada
					 , QuantidadeEncarte
					 , DataEnvio
					 , HoraEnvio
                     , Frete 
                     , DFcod_canal_venda )
				SELECT @COD_REPRESENTANTE AS Codigo_Vendedor_Palm
					 , @DFid_pedido_venda_integracao  AS NumeroPedidoAFV
					 , CASE WHEN LEN(TRIM(documentId)) > 0 THEN TRIM(documentId)  ELSE TRIM(documentId) END AS CnpjCpf
					 , GETDATE() AS Data
					 , GETDATE() AS Hora
					 , 'V' AS TipoPedido
					 , @COD_PLANO_PAGAMENTO AS CodigoCondicaoPagamento
					 , @COD_PLANO_PAGAMENTO AS CodigoFormaPagamento
					 , @COD_TABELA_PRECO AS CodigoTabelaPreco
					 , NULL AS Observacao
					 , 0 AS NumeroItens
					 , 0 AS TotalItens
					 , 0
					 , totalAmount
					 , NULL AS Status
					 , NULL AS Urgente
					 , NULL AS Prazo1
					 , NULL AS Prazo2
					 , NULL AS Prazo3
					 , NULL AS Prazo4
					 , NULL AS Prazo5
					 , NULL AS CodigoVisita
					 , NULL AS NumeroFechamento
					 , NULL AS CodigoEncarte
					 , NULL AS CodigoCasada
					 , NULL AS QuantidadeEncarte
					 , GETDATE() AS DataEnvio
					 , GETDATE() AS HoraEnvio
                     , 0
                     , saleChannel
				  FROM #TBtemp_xml
				 WHERE id = @DFid
				   AND @DFid_pedido_venda_integracao
				   NOT IN (SELECT NumeroPedidoAFV 
							 FROM TBpedido_venda_site)
				 GROUP BY CASE WHEN LEN(TRIM(documentId)) > 0 THEN TRIM(documentId)  ELSE TRIM(documentId) END
						, totalAmount

               

			END TRY BEGIN CATCH

				SET @ERROR = 'ERRO INSERINDO REGISTROS TBpedido_venda_site'
				ROLLBACK TRANSACTION
				EXEC SP_GRAVA_LOG_ERRO_INTEGRACAO @XML, 'SP_IMPORTA_PEDIDOS_P4M_TECNOSSPEED', @ERROR  
				
                CLOSE CURSOR_XML;
	            DEALLOCATE CURSOR_XML;

                SELECT @ERROR
				RETURN;

			END CATCH

			BEGIN TRY

				INSERT INTO TBitem_pedido_venda_site
					 ( Codigo_Vendedor_Palm	
					 , NumeroItemAFV	
					 , NumeroPedidoAFV	
					 , CodigoProduto	
					 , TipoItem	
					 , Quantidade	
					 , PrecoUnitario	
					 , DiferencaPrecos	
					 , DescontoUnitarioPercentual	
					 , PrecoUnitarioComDesconto	
					 , ValorTotalItem	
					 , Status	
					 , NumeroFechamento
					 , CodigoCasada	
					 , DescricaoEmbalagem
					 , Data	
					 , Hora	 
					 , PrecoPromocao	
					 , DataEnvio	 
					 , HoraEnvio )
				SELECT @COD_REPRESENTANTE	
					 , ROW_NUMBER() OVER(ORDER BY id ASC) AS NumeroItemAFV	
					 , @DFid_pedido_venda_integracao AS NumeroPedidoAFV
					 , productId
					 , NULL AS TipoItem
					 , quantity	
					 , price	
					 , NULL AS DiferencaPrecos	
					 , discount
					 , price  AS PrecoUnitarioComDesconto	
					 , price AS ValorTotalItem	
					 , NULL AS Status	
					 , NULL AS NumeroFechamento
					 , NULL AS CodigoCasada	
					 , 1 AS DescricaoEmbalagem
					 , GETDATE() AS Data	
					 , GETDATE() AS Hora	 
					 , NULL AS PrecoPromocao	
					 , GETDATE() AS DataEnvio	 
					 , GETDATE() AS HoraEnvio
				  FROM #TBtemp_itens_xml
				 WHERE id = @DFid
				   AND @DFid_pedido_venda_integracao
				   NOT IN (SELECT NumeroPedidoAFV 
							 FROM TBitem_pedido_venda_site 
							WHERE NumeroPedidoAFV = @DFid_pedido_venda_integracao)
				
			
            SELECT * FROM TBitem_pedido_venda_site

			END TRY BEGIN CATCH
				SET @ERROR = 'ERRO INSERINDO REGISTROS TBitem_pedido_venda_site' + (SELECT cast(@@error as nvarchar(10))) 
				ROLLBACK TRANSACTION
				EXEC SP_GRAVA_LOG_ERRO_INTEGRACAO @XML, 'SP_IMPORTA_PEDIDOS_P4M_TECNOSSPEED',  @ERROR
				
                CLOSE CURSOR_XML;
	            DEALLOCATE CURSOR_XML;
				
                SELECT @ERROR
                RETURN;
			END CATCH

			BEGIN TRY

				UPDATE TBpedido_venda_site
				   SET NumeroItens = QRcontagem.DFcont
				  FROM TBpedido_venda_site 
				 INNER JOIN (SELECT COUNT(NumeroItemAFV) AS DFcont
								  , NumeroPedidoAFV
							   FROM TBitem_pedido_venda_site WITH(NOLOCK)
							   GROUP BY NumeroPedidoAFV) AS QRcontagem
					ON QRcontagem.NumeroPedidoAFV = TBpedido_venda_site.NumeroPedidoAFV

				FETCH NEXT FROM CURSOR_XML
				INTO @DFid_pedido_venda_integracao, @DFid

				UPDATE TBpedido_venda_site
				   SET TotalItens = QRcontagem.ValorTotalItem
				  FROM TBpedido_venda_site 
				 INNER JOIN (SELECT SUM(ValorTotalItem) AS ValorTotalItem
								  , NumeroPedidoAFV
							   FROM TBitem_pedido_venda_site WITH(NOLOCK)
							   GROUP BY NumeroPedidoAFV) AS QRcontagem
					ON QRcontagem.NumeroPedidoAFV = TBpedido_venda_site.NumeroPedidoAFV

			END TRY BEGIN CATCH
				SET @ERROR = 'ERRO UPDATE REGISTROS TBpedido_venda_site'
				ROLLBACK TRANSACTION
				EXEC SP_GRAVA_LOG_ERRO_INTEGRACAO @XML, 'SP_IMPORTA_PEDIDOS_P4M_TECNOSSPEED', 'ERRO UPDATE REGISTROS TBpedido_venda_site'  

                CLOSE CURSOR_XML;
	            DEALLOCATE CURSOR_XML;
                
                SELECT @ERROR				
                RETURN;
			END CATCH

		END
	  CLOSE CURSOR_XML;
	DEALLOCATE CURSOR_XML;

	BEGIN TRY

		DECLARE @RET INT
		DECLARE @MSG NVARCHAR(500)

		   EXEC SP_GERA_PEDIDO_VENDA_NEOMODE @RET OUTPUT, @MSG OUTPUT
	     SELECT @RET, @MSG

	END TRY BEGIN CATCH
        ROLLBACK TRANSACTION
		
        SET @ERROR = 'ERRO GERAÇÃO DE PEDIDO DE VENDA sp_ft_Importacao_Pedidos_Site ' + CAST(@@ERROR AS NVARCHAR(10))
		EXEC SP_GRAVA_LOG_ERRO_INTEGRACAO @XML, 'SP_IMPORTA_PEDIDOS_P4M_TECNOSSPEED + sp_ft_Importacao_Pedidos_Site', 'ERRO GERAÇÃO DE PEDIDO DE VENDA sp_ft_Importacao_Pedidos_Site'  
		SELECT @ERROR
		RETURN;
	END CATCH



COMMIT TRANSACTION 







