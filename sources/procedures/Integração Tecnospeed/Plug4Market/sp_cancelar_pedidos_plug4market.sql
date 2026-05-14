IF OBJECT_ID('sp_cancelar_pedidos_plug4market') IS NOT NULL
    DROP PROCEDURE sp_cancelar_pedidos_plug4market
GO

CREATE PROCEDURE sp_cancelar_pedidos_plug4market
WITH ENCRYPTION 
AS
BEGIN

	/*
    AUTOR......: Diego Mattos
    AREA.......: Integração Plug4Market
    MODULO.....: Comercial
    DATA\HORA..: 30/12/2025
    
    Função: Retorna a URL montada dos pedidos cancelados para envio a Plug4Market

    Exemplo de uso:
    EXEC sp_confirmar_integracao_pedidos_plug4market 
	
	Exemplo de retorno: orders/97c7d3ad-b699-4cc9-bd71-43ce1a659397/cancel/1
    */

    SELECT 'orders/'
       + tbpedido_venda_integracao.dfid_integracao
       + '/cancel/'
       + Cast(tbpedido_venda_site.dfcod_canal_venda AS NVARCHAR)
FROM   tbpedido_venda WITH (nolock)
       INNER JOIN tbpedido_venda_site
               ON tbpedido_venda_site.dfcod_pedido_venda =
                  tbpedido_venda.dfcod_pedido_venda
       INNER JOIN tbpedido_venda_integracao
               ON tbpedido_venda_integracao.dfid_pedido_venda_integracao =
                  tbpedido_venda_site.numeropedidoafv
WHERE  tbpedido_venda.dfcod_representante = 131
       AND tbpedido_venda.dfstatus = 'C'
END
GO
