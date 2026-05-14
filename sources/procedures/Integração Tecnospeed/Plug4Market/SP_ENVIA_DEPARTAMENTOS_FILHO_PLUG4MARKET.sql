IF OBJECT_ID('SP_ENVIA_DEPARTAMENTOS_FILHO_PLUG4MARKET') IS NOT NULL
    DROP PROCEDURE SP_ENVIA_DEPARTAMENTOS_FILHO_PLUG4MARKET
GO

CREATE PROCEDURE SP_ENVIA_DEPARTAMENTOS_FILHO_PLUG4MARKET (@ID_DEPARTAMENTO INT)
WITH ENCRYPTION 
AS
BEGIN

/*
    AUTOR......: Edilson Costa e Éverton Coelho
    AREA.......: Integração Plug4Market
    MODULO.....: Comercial
    DATA\HORA..: 20/02/2025
    
    Função: Enviar dados dos departamentos dos itens para API da Tecnospeed / Plug$Market

    Exemplo de uso:

        EXEC SP_ENVIA_DEPARTAMENTOS_FILHO_PLUG4MARKET 1

*/

        SELECT 'true' as '@omitir'
             , TBdepartamento_item.DFdescricao AS 'name'
             , TBdepartamento_item.DFid_departamento_item  AS 'alternativeId'
             , TBdepartamento_item.DFid_departamento_item_pai AS 'fatherAlternativeId'
          FROM TBdepartamento_item WITH(NOLOCK)
        WHERE DFid_departamento_item = @ID_DEPARTAMENTO
         ORDER BY DFdescricao ASC
           FOR XML PATH ('dados'), TYPE
 END