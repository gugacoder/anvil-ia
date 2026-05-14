IF OBJECT_ID('sp_obtem_pedidos_cancelados_marketplace_plug4market ') IS NOT NULL
    DROP PROCEDURE sp_obtem_pedidos_cancelados_marketplace_plug4market 
GO

CREATE PROCEDURE sp_obtem_pedidos_cancelados_marketplace_plug4market (@xml AS XML)
WITH ENCRYPTION 
AS
SET NOCOUNT ON  


	/*
    AUTOR......: Diego Mattos
    AREA.......: Integração Plug4Market
    MODULO.....: Comercial
    DATA\HORA..: 08/01/2025
    
    Função: Recebe a lista de pedidos integrados que foram cancelados no marketplace para atualização no Director 

    Exemplo de uso:
    EXEC sp_retorna_lista_pedidos_importacao_plug4market @xml --> array de pedidos cancelados no marketplace
	
	*/


    IF OBJECT_ID('tempdb.dbo.#TBtemp_xml', 'u') IS NOT NULL BEGIN
	    DROP TABLE #TBtemp_xml
    END 
	
	DECLARE @ERROR NVARCHAR(MAX)
	
	CREATE TABLE #TBtemp_xml
         ( id           NVARCHAR(MAX)
         , orderIdStore NVARCHAR(20)
		 , integratedStore NVARCHAR(10)
		 , status NVARCHAR(20))
	
	BEGIN TRY
	
	INSERT INTO #TBtemp_xml
	SELECT  pedido.value('id[1]', 'NVARCHAR(MAX)'),
			pedido.value('orderIdStore[1]', 'NVARCHAR(20)'),
			pedido.value('integratedStore[1]', 'NVARCHAR(10)'),
			pedido.value('status[1]', 'NVARCHAR(20)')
	FROM @xml.nodes('Parametros/data') AS T(pedido);
	
	END TRY BEGIN CATCH
	
	SET @ERROR = 'ERRO AO CRIAR E POPULAR TABELA TEMPORARIA COM OS REGISTROS DO XML'
	    EXEC SP_GRAVA_LOG_ERRO_INTEGRACAO @XML, 'sp_obtem_pedidos_cancelados_marketplace_plug4market', @ERROR  
	    SELECT @ERROR
        RETURN;

    END CATCH
	
	select * from #TBtemp_xml
	
	BEGIN TRANSACTION 
	
	    BEGIN TRY
	
			UPDATE TBpedido_venda
			SET DFstatus = 'C'
			WHERE 
			DFstatus NOT IN ('C', 'Z') AND
			DFcod_pedido_venda IN 
			(SELECT TBxml.orderIdStore 
			FROM #TBtemp_xml as TBxml 
			INNER JOIN TBpedido_venda_integracao ON TBpedido_venda_integracao.DFid_integracao = TBxml.id
			WHERE TBxml.integratedStore = 'true' AND TBxml.status = 'CANCELED')
			
			UPDATE TBpedido_venda_site 
			SET DFstatus = 'C',
				Observação = 'PEDIDO CANCELADO NO MARKETPLACE DE ORIGEM'
			WHERE 
			DFstatus NOT IN ('C', 'Z') AND
			DFcod_pedido_venda IN 
			(SELECT TBxml.orderIdStore 
			FROM #TBtemp_xml as TBxml 
			INNER JOIN TBpedido_venda_integracao ON TBpedido_venda_integracao.DFid_integracao = TBxml.id
			WHERE TBxml.integratedStore = 'true' AND TBxml.status = 'CANCELED')
			
		END TRY BEGIN CATCH

		    SET @ERROR = 'ERRO CANCELANDO PEDIDOS TBpedido_venda_site'
		    ROLLBACK TRANSACTION
		    EXEC SP_GRAVA_LOG_ERRO_INTEGRACAO @XML, 'sp_obtem_pedidos_cancelados_marketplace_plug4market', @ERROR  
		    SELECT @ERROR
		    RETURN;

	    END CATCH
		
	SET NOCOUNT OFF
    
	COMMIT TRANSACTION
	
