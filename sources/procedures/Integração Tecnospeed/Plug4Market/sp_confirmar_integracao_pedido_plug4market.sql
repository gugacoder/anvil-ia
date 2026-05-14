IF OBJECT_ID('sp_confirmar_integracao_pedido_plug4market') IS NOT NULL
    DROP PROCEDURE sp_confirmar_integracao_pedido_plug4market
GO

CREATE PROCEDURE sp_confirmar_integracao_pedido_plug4market(@ID_INTEGRACAO_PEDIDO NVARCHAR(50))
WITH ENCRYPTION 
AS
BEGIN

	/*
    AUTOR......: Diego Mattos
    AREA.......: Integração Plug4Market
    MODULO.....: Comercial
    DATA\HORA..: 26/12/2025
    
    Função: Retorna o nº do pedido no Director para confirmação no marketplace via Plug4Market

    Exemplo de uso:
    EXEC sp_confirmar_integracao_pedido_plug4market '97c7d3ad-b699-4cc9-bd71-43ce1a659397' 
    */

    SELECT 
       tbpedido_venda.dfcod_pedido_venda as orderIdStore
	FROM   tbpedido_venda WITH (nolock)
       INNER JOIN tbpedido_venda_site
               ON tbpedido_venda_site.dfcod_pedido_venda =
                  tbpedido_venda.dfcod_pedido_venda
       INNER JOIN tbpedido_venda_integracao
               ON tbpedido_venda_integracao.dfid_pedido_venda_integracao =
                  tbpedido_venda_site.numeropedidoafv
	WHERE  tbpedido_venda_integracao.dfid_integracao = @ID_INTEGRACAO_PEDIDO
	FOR XML PATH ('retorno'), TYPE
END
GO
